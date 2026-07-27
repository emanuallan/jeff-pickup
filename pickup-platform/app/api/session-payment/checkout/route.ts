import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getEventByRef, canUpdateArrivalStatus, isEventCancelled } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, getPlatformFeePercent } from '@/lib/stripe'
import { orgBaseUrl } from '@/lib/site-url'
import { isPaidSession } from '@/lib/session-payment'
import { getLinkedParticipantForOrg } from '@/lib/participant-account'
import { resolveGuestCount } from '@/lib/guest-signups'
import { orgFeatures } from '@/lib/org-features'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'

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

  if (!slug || !eventRef) {
    return NextResponse.json({ error: 'Missing session details.' }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to join a paid session.', code: 'auth_required' },
      { status: 401 },
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

  let linked = await getLinkedParticipantForOrg(org.id)

  if (!linked) {
    if (!isValidPhoneDigits(phone) || !firstName || !lastName) {
      return NextResponse.json(
        {
          error: 'Enter your name and phone to continue.',
          code: 'profile_required',
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: ensured, error: ensureError } = await supabase.rpc(
      'ensure_participant_for_auth_user',
      {
        p_org_id: org.id,
        p_phone: phone,
        p_first_name: firstName,
        p_last_name: lastName,
      },
    )

    if (ensureError || !ensured) {
      return NextResponse.json(
        { error: ensureError?.message || 'Could not save your profile.' },
        { status: 400 },
      )
    }

    const row = ensured as { participant_id?: string; phone?: string }
    if (!row.participant_id) {
      return NextResponse.json({ error: 'Could not save your profile.' }, { status: 400 })
    }
    linked = { participant_id: String(row.participant_id), phone: String(row.phone ?? phone) }
  }

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

  const amountCents = event.price_cents ?? 0
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
      participant_id: linked.participant_id,
      user_id: user.id,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'pending',
      guest_count: guestCount,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 })
  }

  const stripe = getStripe()
  const baseUrl = orgBaseUrl(slug)
  const title = event.title?.trim() || 'Session'

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: {
                name: `${org.name} · ${title}`,
                description: 'Session signup',
              },
            },
          },
        ],
        success_url: `${baseUrl}/?cal=${encodeURIComponent(event.short_id)}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?cal=${encodeURIComponent(event.short_id)}&paid=0`,
        customer_email: user.email ?? undefined,
        metadata: {
          checkout_kind: 'session_payment',
          org_id: org.id,
          event_id: event.id,
          payment_id: payment.id,
          participant_id: linked.participant_id,
          user_id: user.id,
        },
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            checkout_kind: 'session_payment',
            org_id: org.id,
            event_id: event.id,
            payment_id: payment.id,
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

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('session payment checkout failed', err)
    await admin.from('event_payments').update({ status: 'failed' }).eq('id', payment.id)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
  }
}
