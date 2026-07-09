import { NextResponse } from 'next/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, getPlatformFeePercent } from '@/lib/stripe'
import { orgBaseUrl } from '@/lib/site-url'
import {
  validateSponsorLogoUrl,
  validateSponsorMessage,
  validateSponsorName,
  validateSponsorUrl,
} from '@/lib/sponsorship'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { orgFeatures } from '@/lib/org-features'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const tierId = String(body.tierId ?? '').trim()
  const sponsorName = String(body.sponsorName ?? '').trim()
  const logoUrl = String(body.logoUrl ?? '').trim()
  const sponsorUrl = String(body.sponsorUrl ?? '').trim()
  const sponsorMessage = String(body.sponsorMessage ?? '').trim()

  if (!slug || !tierId) {
    return NextResponse.json({ error: 'Missing sponsorship details.' }, { status: 400 })
  }

  const nameError = validateSponsorName(sponsorName)
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 })

  const logoError = validateSponsorLogoUrl(logoUrl)
  if (logoError) return NextResponse.json({ error: logoError }, { status: 400 })

  const urlResult = validateSponsorUrl(sponsorUrl)
  if (!urlResult.ok) return NextResponse.json({ error: urlResult.error }, { status: 400 })

  const messageError = validateSponsorMessage(sponsorMessage)
  if (messageError) return NextResponse.json({ error: messageError }, { status: 400 })

  const org = await getPublicOrgBySlug(slug)
  if (!org || !orgFeatures(org).group_sponsorships) {
    return NextResponse.json({ error: 'Sponsorships are not available.' }, { status: 404 })
  }

  const stripeAccount = await getOrgStripeAccount(org.id)
  if (!stripeAccount?.charges_enabled) {
    return NextResponse.json({ error: 'Sponsorships are not available yet.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: tier, error: tierError } = await admin
    .from('sponsorship_tiers')
    .select('id, stripe_price_id, price_cents, currency, status')
    .eq('id', tierId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (tierError || !tier || tier.status !== 'active' || !tier.stripe_price_id) {
    return NextResponse.json({ error: 'Tier not found.' }, { status: 404 })
  }

  const stripe = getStripe()
  const baseUrl = orgBaseUrl(slug)
  const feePercent = getPlatformFeePercent()

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${baseUrl}/sponsorship/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/sponsorship/canceled`,
      metadata: {
        org_id: org.id,
        tier_id: tier.id,
        sponsor_name: sponsorName,
        logo_url: logoUrl,
        sponsor_url: urlResult.value ?? '',
        sponsor_message: sponsorMessage,
        monthly_amount_cents: String(tier.price_cents),
        currency: tier.currency ?? 'usd',
        platform_fee_percent: String(feePercent),
      },
      subscription_data: {
        application_fee_percent: feePercent,
        metadata: {
          org_id: org.id,
          tier_id: tier.id,
        },
      },
    },
    { stripeAccount: stripeAccount.stripe_account_id },
  )

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: session.url })
}
