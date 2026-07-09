import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { rootBaseUrl } from '@/lib/site-url'

export async function createConnectExpressAccount(orgId: string, orgName: string, orgSlug: string) {
  const stripe = getStripe()

  const account = await stripe.accounts.create({
    type: 'express',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: orgName,
      url: `${rootBaseUrl()}/org/${orgSlug}`,
    },
    metadata: {
      org_id: orgId,
      org_slug: orgSlug,
    },
  })

  const admin = createAdminClient()
  await admin.rpc('upsert_org_stripe_account', {
    p_org_id: orgId,
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled ?? false,
    p_payouts_enabled: account.payouts_enabled ?? false,
    p_details_submitted: account.details_submitted ?? false,
  })

  return account
}

export async function createConnectAccountLink(
  stripeAccountId: string,
  orgSlug: string,
  refreshPath: string,
  returnPath: string,
) {
  const stripe = getStripe()
  const base = rootBaseUrl()

  return stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${base}${refreshPath}`,
    return_url: `${base}${returnPath}`,
    type: 'account_onboarding',
  })
}

export async function syncConnectAccountStatus(stripeAccountId: string) {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(stripeAccountId)
  const orgId = account.metadata?.org_id

  if (!orgId) return account

  const admin = createAdminClient()
  await admin.rpc('upsert_org_stripe_account', {
    p_org_id: orgId,
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled ?? false,
    p_payouts_enabled: account.payouts_enabled ?? false,
    p_details_submitted: account.details_submitted ?? false,
  })

  return account
}

export async function createTierStripeProductAndPrice(input: {
  stripeAccountId: string
  orgId: string
  tierId: string
  name: string
  description: string
  priceCents: number
  currency?: string
}) {
  const stripe = getStripe()

  const product = await stripe.products.create(
    {
      name: input.name,
      description: input.description || undefined,
      metadata: {
        org_id: input.orgId,
        tier_id: input.tierId,
      },
    },
    { stripeAccount: input.stripeAccountId },
  )

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: input.priceCents,
      currency: input.currency ?? 'usd',
      recurring: { interval: 'month' },
      metadata: {
        org_id: input.orgId,
        tier_id: input.tierId,
      },
    },
    { stripeAccount: input.stripeAccountId },
  )

  return { productId: product.id, priceId: price.id }
}

export async function deactivateTierStripePrice(stripeAccountId: string, priceId: string) {
  const stripe = getStripe()
  await stripe.prices.update(priceId, { active: false }, { stripeAccount: stripeAccountId })
}

export async function cancelStripeSubscription(subscriptionId: string, stripeAccountId: string) {
  const stripe = getStripe()
  await stripe.subscriptions.cancel(subscriptionId, {}, { stripeAccount: stripeAccountId })
}
