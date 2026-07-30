import { NextResponse } from 'next/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getEventByRef, canUpdateArrivalStatus, isEventCancelled } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, getPlatformFeePercent } from '@/lib/stripe'
import { orgBaseUrl } from '@/lib/site-url'
import {
  isPaidSession,
  paidSessionHeadcount,
  sessionPaymentTotalCents,
} from '@/lib/session-payment'
import { resolveGuestCount } from '@/lib/guest-signups'
import { orgFeatures } from '@/lib/org-features'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const eventRef = String(body.eventId ?? '').trim()
  const guestCountRaw = Number.parseInt(String(body.guestCount ?? '0'), 10)
  const phone = normalizePhoneDigits(String(body.phone ?? ''))
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = normalizeLoginEmail(String(body.email ?? ''))

  if (!slug || !eventRef) {
    return NextResponse.json({ error: 'Missing session details.' }, { status: 400 })
  }

  if (!isValidPhoneDigits(phone) || !firstName || !lastName) {
    return NextResponse.json(
      { error: 'Enter your name and phone to continue.', code: 'profile_required' },
      { status: 400 },
    )
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address.', code: 'email_required' },
      { status: 400 },
    )
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
  }

  const event = await getEventByRef(eventRef, org.id)
  if (!event) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  if (isEventCancelled(event.status)) {
    return NextResponse.json({ error: 'This session was cancelled.' }, { status: 400 })
  }

  if (!canUpdateArrivalStatus(event)) {
    return NextResponse.json({ error: 'This session has ended.' }, { status: 400 })
  }

  if (!isPaidSession(event.price_cents)) {
    return NextResponse.json({ error: 'This session is free — join without payment.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: prepared, error: prepareError } = await supabase.rpc(
    'prepare_paid_checkout_participant',
    {
      p_org_id: org.id,
      p_phone: phone,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
    },
  )

  if (prepareError || !prepared) {
    return NextResponse.json(
      { error: prepareError?.message || 'Could not save your profile.' },
      { status: 400 },
    )
  }

  const row = prepared as { participant_id?: string; session_token?: string; phone?: string }
  if (!row.participant_id || !row.session_token) {
    return NextResponse.json({ error: 'Could not save your profile.' }, { status: 400 })
  }

  const participantId = String(row.participant_id)
  const sessionToken = String(row.session_token)

  const guestsEnabled = orgFeatures(org).guest_signups
  const guestCount = resolveGuestCount(guestCountRaw, guestsEnabled)

  const admin = createAdminClient()
  const { data: stripeAccount } = await admin
    .from('org_stripe_accounts')
    .select('stripe_account_id, charges_enabled')
    .eq('org_id', org.id)
    .maybeSingle()

  if (!stripeAccount?.charges_enabled || !stripeAccount.stripe_account_id) {
    return NextResponse.json(
      { error: 'This group is not set up to accept payments yet.' },
      { status: 400 },
    )
  }

  const amountCentsPerPerson = event.price_cents ?? 0
  if (amountCentsPerPerson <= 0) {
    return NextResponse.json({ error: 'Invalid session price.' }, { status: 400 })
  }

  const headcount = paidSessionHeadcount(guestCount)
  const amountCents = sessionPaymentTotalCents(amountCentsPerPerson, guestCount)
  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid session price.' }, { status: 400 })
  }

  const feePercent = getPlatformFeePercent()
  const applicationFeeAmount = Math.max(0, Math.round((amountCents * feePercent) / 100))

  const { data: payment, error: paymentError } = await admin
    .from('event_payments')
    .insert({
      org_id: org.id,
      event_id: event.id,
      participant_id: participantId,
      user_id: null,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'pending',
      guest_count: guestCount,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    console.error('event_payments insert failed', paymentError)
    return NextResponse.json(
      {
        error: 'Could not start payment.',
        detail: paymentError?.message ?? 'Insert returned no row.',
      },
      { status: 500 },
    )
  }

  const stripe = getStripe()
  const baseUrl = orgBaseUrl(slug)
  const title = event.title?.trim() || 'Session'
  const peopleLabel = headcount === 1 ? '1 person' : `${headcount} people`

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: headcount,
            price_data: {
              currency: 'usd',
              unit_amount: amountCentsPerPerson,
              product_data: {
                name: `${org.name} · ${title}`,
                description: `Session signup · ${peopleLabel}`,
              },
            },
          },
        ],
        success_url: `${baseUrl}/?cal=${encodeURIComponent(event.short_id)}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?cal=${encodeURIComponent(event.short_id)}&paid=0`,
        customer_email: email,
        metadata: {
          checkout_kind: 'session_payment',
          org_id: org.id,
          event_id: event.id,
          payment_id: payment.id,
          participant_id: participantId,
          guest_count: String(guestCount),
          headcount: String(headcount),
        },
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            checkout_kind: 'session_payment',
            org_id: org.id,
            event_id: event.id,
            payment_id: payment.id,
            guest_count: String(guestCount),
            headcount: String(headcount),
          },
        },
      },
      { stripeAccount: stripeAccount.stripe_account_id },
    )

    await admin
      .from('event_payments')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', payment.id)

    if (!session.url) {
      return NextResponse.json({ error: 'Could not create checkout.' }, { status: 500 })
    }

    const response = NextResponse.json({ url: session.url })
    response.cookies.set(SESSION_COOKIE, sessionToken, getParticipantCookieOptions())
    return response
  } catch (err) {
    console.error('session payment checkout failed', err)
    await admin.from('event_payments').update({ status: 'failed' }).eq('id', payment.id)
    const detail =
      err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Stripe checkout failed.'
    return NextResponse.json(
      { error: 'Could not start checkout.', detail },
      { status: 500 },
    )
  }
}
