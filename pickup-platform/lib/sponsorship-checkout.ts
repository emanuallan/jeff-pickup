import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

type CheckoutRpcPayload = {
  p_org_id: string
  p_tier_id: string
  p_sponsor_name: string
  p_logo_url: string
  p_sponsor_url: string | null
  p_sponsor_message: string | null
  p_contact_email: string
  p_stripe_customer_id: string | null
  p_stripe_subscription_id: string
  p_stripe_checkout_session_id: string
  p_monthly_amount_cents: number
  p_currency: string
  p_platform_fee_percent: number
  p_subscription_status: string
}

export function buildSponsorshipCheckoutRpcPayload(
  session: Stripe.Checkout.Session,
): CheckoutRpcPayload | null {
  const metadata = session.metadata ?? {}
  const orgId = metadata.org_id
  const tierId = metadata.tier_id
  const sponsorName = metadata.sponsor_name
  const logoUrl = metadata.logo_url

  if (!orgId || !tierId || !sponsorName || !logoUrl || !session.subscription) {
    return null
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id

  return {
    p_org_id: orgId,
    p_tier_id: tierId,
    p_sponsor_name: sponsorName,
    p_logo_url: logoUrl,
    p_sponsor_url: metadata.sponsor_url?.trim() ? metadata.sponsor_url : null,
    p_sponsor_message: metadata.sponsor_message?.trim() ? metadata.sponsor_message : null,
    p_contact_email: session.customer_details?.email ?? session.customer_email ?? '',
    p_stripe_customer_id:
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    p_stripe_subscription_id: subscriptionId,
    p_stripe_checkout_session_id: session.id,
    p_monthly_amount_cents: Number(metadata.monthly_amount_cents ?? 0),
    p_currency: metadata.currency ?? 'usd',
    p_platform_fee_percent: Number(metadata.platform_fee_percent ?? 5),
    p_subscription_status: 'active',
  }
}

export async function upsertSponsorshipFromCheckoutSession(session: Stripe.Checkout.Session) {
  const payload = buildSponsorshipCheckoutRpcPayload(session)
  if (!payload) {
    return { ok: false as const, reason: 'missing_fields' as const }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('upsert_sponsorship_from_checkout', payload)

  if (error) {
    throw new Error(`upsert_sponsorship_from_checkout failed: ${error.message}`)
  }

  return { ok: true as const, id: data as string }
}

async function getConnectedStripeAccountId(orgId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('org_stripe_accounts')
    .select('stripe_account_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw new Error(`org_stripe_accounts lookup failed: ${error.message}`)
  }

  return data?.stripe_account_id ?? null
}

/** Recover sponsorship rows when Connect checkout webhooks are not received on the platform. */
export async function syncSponsorshipCheckoutForOrg(orgId: string, sessionId: string) {
  const stripeAccountId = await getConnectedStripeAccountId(orgId)
  if (!stripeAccountId) {
    return { ok: false as const, reason: 'stripe_account_missing' as const }
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    { expand: ['subscription', 'customer'] },
    { stripeAccount: stripeAccountId },
  )

  if (session.status !== 'complete') {
    return { ok: false as const, reason: 'incomplete' as const }
  }

  if (session.metadata?.org_id !== orgId) {
    return { ok: false as const, reason: 'org_mismatch' as const }
  }

  const result = await upsertSponsorshipFromCheckoutSession(session)
  if (!result.ok) {
    return result
  }

  return { ok: true as const, id: result.id }
}
