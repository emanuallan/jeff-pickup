import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { rootBaseUrl } from '@/lib/site-url'

type OrgStripeAccountSnapshot = {
  org_id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}

async function upsertOrgStripeAccount(snapshot: OrgStripeAccountSnapshot) {
  const admin = createAdminClient()
  const { error } = await admin.rpc('upsert_org_stripe_account', {
    p_org_id: snapshot.org_id,
    p_stripe_account_id: snapshot.stripe_account_id,
    p_charges_enabled: snapshot.charges_enabled,
    p_payouts_enabled: snapshot.payouts_enabled,
    p_details_submitted: snapshot.details_submitted,
  })

  if (error) {
    throw new Error(`upsert_org_stripe_account failed: ${error.message}`)
  }
}

export async function findStripeAccountIdForOrg(orgId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('org_stripe_accounts')
    .select('stripe_account_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    const lookupError = new Error(`org_stripe_accounts lookup failed: ${error.message}`) as Error & {
      code?: string
    }
    lookupError.code = error.code
    throw lookupError
  }

  if (data?.stripe_account_id) {
    return data.stripe_account_id
  }

  const stripe = getStripe()
  let startingAfter: string | undefined

  do {
    const page = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    const match = page.data.find((account) => account.metadata?.org_id === orgId)
    if (match) {
      return match.id
    }

    startingAfter =
      page.has_more && page.data.length > 0 ? page.data[page.data.length - 1]?.id : undefined
  } while (startingAfter)

  return null
}

export async function createConnectExpressAccount(orgId: string, orgName: string, orgSlug: string) {
  const stripe = getStripe()

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
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

  await upsertOrgStripeAccount({
    org_id: orgId,
    stripe_account_id: account.id,
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
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

  await upsertOrgStripeAccount({
    org_id: orgId,
    stripe_account_id: account.id,
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
  })

  return account
}

/** Sync a connected account after onboarding — finds Stripe account even if DB row is missing. */
export async function syncConnectAccountForOrg(orgId: string) {
  const stripeAccountId = await findStripeAccountIdForOrg(orgId)
  if (!stripeAccountId) {
    return null
  }

  return syncConnectAccountStatus(stripeAccountId)
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
