import type Stripe from 'stripe'
import { getPlatformFeePercent, getStripe } from '@/lib/stripe'
import { resolveSponsorRefundAmountCents } from '@/lib/sponsorship'
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

/** Express dashboard login — balances, bank payouts, and payout schedule. */
export async function createConnectExpressLoginLink(stripeAccountId: string) {
  const stripe = getStripe()
  return stripe.accounts.createLoginLink(stripeAccountId)
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

type ConnectRequestOptions = { stripeAccount: string }

function paymentIntentIdFromExpanded(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return value.id
  return null
}

function invoiceIdFromExpanded(value: string | Stripe.Invoice | null | undefined): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return value.id
  return null
}

function paymentIntentIdFromInvoicePayment(payment: Stripe.InvoicePayment): string | null {
  if (payment.status !== 'paid') return null
  if (payment.payment.type !== 'payment_intent') return null
  return paymentIntentIdFromExpanded(payment.payment.payment_intent)
}

/** Resolve PaymentIntent via Invoice Payments API (Basil+ removed Invoice.payment_intent). */
async function paymentIntentIdFromInvoiceId(
  invoiceId: string,
  connectOpts: ConnectRequestOptions,
): Promise<string | null> {
  const stripe = getStripe()

  const invoicePayments = await stripe.invoicePayments.list(
    {
      invoice: invoiceId,
      status: 'paid',
      limit: 10,
      expand: ['data.payment.payment_intent'],
    },
    connectOpts,
  )

  for (const payment of invoicePayments.data) {
    const paymentIntentId = paymentIntentIdFromInvoicePayment(payment)
    if (paymentIntentId) return paymentIntentId
  }

  // Fallback: expand payments on the invoice itself (max 4 expand levels).
  const invoice = await stripe.invoices.retrieve(
    invoiceId,
    { expand: ['payments.data.payment.payment_intent'] },
    connectOpts,
  )
  for (const payment of invoice.payments?.data ?? []) {
    const paymentIntentId = paymentIntentIdFromInvoicePayment(payment)
    if (paymentIntentId) return paymentIntentId
  }

  return null
}

async function resolveSponsorshipPaymentIntent(
  subscriptionId: string,
  checkoutSessionId: string | null | undefined,
  connectOpts: ConnectRequestOptions,
): Promise<string | null> {
  const stripe = getStripe()

  // Keep expands shallow — nested expands deeper than 4 levels are rejected by Stripe.
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    { expand: ['latest_invoice'] },
    connectOpts,
  )

  const latestInvoice = subscription.latest_invoice
  const latestInvoiceId = invoiceIdFromExpanded(latestInvoice)
  const latestInvoicePaid =
    typeof latestInvoice === 'string' || latestInvoice?.status === 'paid'

  if (latestInvoiceId && latestInvoicePaid) {
    const fromLatest = await paymentIntentIdFromInvoiceId(latestInvoiceId, connectOpts)
    if (fromLatest) return fromLatest
  }

  const paidInvoices = await stripe.invoices.list(
    {
      subscription: subscriptionId,
      status: 'paid',
      limit: 1,
    },
    connectOpts,
  )
  const paidInvoiceId = paidInvoices.data[0]?.id
  if (paidInvoiceId) {
    const fromPaid = await paymentIntentIdFromInvoiceId(paidInvoiceId, connectOpts)
    if (fromPaid) return fromPaid
  }

  if (checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(
      checkoutSessionId,
      { expand: ['invoice', 'payment_intent'] },
      connectOpts,
    )

    const sessionPaymentIntent = paymentIntentIdFromExpanded(session.payment_intent)
    if (sessionPaymentIntent) return sessionPaymentIntent

    const sessionInvoiceId = invoiceIdFromExpanded(session.invoice)
    if (sessionInvoiceId) {
      return paymentIntentIdFromInvoiceId(sessionInvoiceId, connectOpts)
    }
  }

  return null
}

function reportedApplicationFeeCents(
  paymentIntent: Stripe.PaymentIntent,
  latestCharge: Stripe.Charge | null,
): number | null {
  if (latestCharge && typeof latestCharge.application_fee_amount === 'number') {
    return latestCharge.application_fee_amount
  }
  if (typeof paymentIntent.application_fee_amount === 'number') {
    return paymentIntent.application_fee_amount
  }
  return null
}

/** Stripe + tax/etc from balance_transaction, excluding Connect application fee. */
function reportedStripeProcessingFeeCents(latestCharge: Stripe.Charge | null): number | null {
  const balanceTransaction = latestCharge?.balance_transaction
  if (!balanceTransaction || typeof balanceTransaction === 'string') return null
  if (!Array.isArray(balanceTransaction.fee_details) || balanceTransaction.fee_details.length === 0) {
    return null
  }

  let processing = 0
  let sawNonApplication = false
  for (const detail of balanceTransaction.fee_details) {
    if (detail.type === 'application_fee') continue
    processing += detail.amount
    sawNonApplication = true
  }
  return sawNonApplication ? processing : null
}

/** Total fees on the connected-account balance transaction (app fee + Stripe). */
function reportedTotalFeeCents(latestCharge: Stripe.Charge | null): number | null {
  const balanceTransaction = latestCharge?.balance_transaction
  if (!balanceTransaction || typeof balanceTransaction === 'string') return null
  if (typeof balanceTransaction.fee === 'number' && balanceTransaction.fee > 0) {
    return balanceTransaction.fee
  }
  return null
}

export function stripeErrorMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return null
}

function isStripeAlreadyRefunded(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'charge_already_refunded'
  )
}

function isStripeMissingResource(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'resource_missing'
  )
}

/** Period end unix seconds from modern Stripe subscription shapes. */
export function stripeSubscriptionPeriodEndUnix(
  subscription: Stripe.Subscription,
): number | null {
  if (typeof subscription.cancel_at === 'number' && subscription.cancel_at > 0) {
    return subscription.cancel_at
  }

  const itemEnds = (subscription.items?.data ?? [])
    .map((item) =>
      typeof item.current_period_end === 'number' ? item.current_period_end : null,
    )
    .filter((value): value is number => value != null && value > 0)

  if (itemEnds.length === 0) return null
  return Math.max(...itemEnds)
}

export function stripeSubscriptionPeriodEndIso(
  subscription: Stripe.Subscription,
): string | null {
  const unix = stripeSubscriptionPeriodEndUnix(subscription)
  return unix ? new Date(unix * 1000).toISOString() : null
}

export type RefundAndCancelSponsorshipResult = {
  refunded: boolean
  canceled: boolean
}

export type SponsorshipRefundPolicy = 'retain_fees' | 'full'

async function resolveSponsorshipRefund(
  subscriptionId: string,
  checkoutSessionId: string | null | undefined,
  connectOpts: ConnectRequestOptions,
  policy: SponsorshipRefundPolicy,
): Promise<{
  paymentIntentId: string
  chargeId: string | null
  refundAmountCents: number
  refundApplicationFee: boolean
}> {
  const stripe = getStripe()
  const paymentIntentId = await resolveSponsorshipPaymentIntent(
    subscriptionId,
    checkoutSessionId,
    connectOpts,
  )

  if (!paymentIntentId) {
    throw new Error('Could not find the paid sponsorship charge to refund.')
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    paymentIntentId,
    { expand: ['latest_charge.balance_transaction'] },
    connectOpts,
  )

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Sponsorship payment is not refundable (status: ${paymentIntent.status}).`)
  }

  const latestCharge =
    paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== 'string'
      ? paymentIntent.latest_charge
      : null
  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : latestCharge?.id ?? null

  if (latestCharge?.refunded === true) {
    return {
      paymentIntentId,
      chargeId,
      refundAmountCents: 0,
      refundApplicationFee: false,
    }
  }

  const amountRefundedCents = latestCharge?.amount_refunded ?? 0
  const remainingCents = Math.max(paymentIntent.amount - amountRefundedCents, 0)

  if (policy === 'full') {
    if (remainingCents <= 0) {
      return {
        paymentIntentId,
        chargeId,
        refundAmountCents: 0,
        refundApplicationFee: false,
      }
    }
    return {
      paymentIntentId,
      chargeId,
      refundAmountCents: remainingCents,
      refundApplicationFee: true,
    }
  }

  const { refundAmountCents, alreadyRefundedSponsorPortion } = resolveSponsorRefundAmountCents({
    grossAmountCents: paymentIntent.amount,
    amountRefundedCents,
    reportedApplicationFeeCents: reportedApplicationFeeCents(paymentIntent, latestCharge),
    reportedStripeProcessingFeeCents: reportedStripeProcessingFeeCents(latestCharge),
    reportedTotalFeeCents: reportedTotalFeeCents(latestCharge),
    platformFeePercent: getPlatformFeePercent(),
  })

  if (alreadyRefundedSponsorPortion) {
    return {
      paymentIntentId,
      chargeId,
      refundAmountCents: 0,
      refundApplicationFee: false,
    }
  }

  if (refundAmountCents <= 0) {
    throw new Error('Sponsorship refund amount must be greater than zero.')
  }

  return {
    paymentIntentId,
    chargeId,
    refundAmountCents,
    refundApplicationFee: false,
  }
}

/**
 * Refund the latest paid invoice charge, then cancel the subscription.
 * - retain_fees (default): sponsor portion only; keep platform + Stripe processing
 * - full: remaining charge amount + Stripe application fee (group may still eat card fees)
 */
export async function refundAndCancelSponsorshipSubscription(input: {
  subscriptionId: string
  stripeAccountId: string
  checkoutSessionId?: string | null
  refundPolicy?: SponsorshipRefundPolicy
}): Promise<RefundAndCancelSponsorshipResult> {
  const stripe = getStripe()
  const connectOpts: ConnectRequestOptions = { stripeAccount: input.stripeAccountId }
  const refundPolicy = input.refundPolicy ?? 'retain_fees'

  const refundTarget = await resolveSponsorshipRefund(
    input.subscriptionId,
    input.checkoutSessionId,
    connectOpts,
    refundPolicy,
  )

  let refunded = refundTarget.refundAmountCents === 0
  if (refundTarget.refundAmountCents > 0) {
    try {
      await stripe.refunds.create(
        refundTarget.chargeId
          ? {
              charge: refundTarget.chargeId,
              amount: refundTarget.refundAmountCents,
              refund_application_fee: refundTarget.refundApplicationFee,
            }
          : {
              payment_intent: refundTarget.paymentIntentId,
              amount: refundTarget.refundAmountCents,
              refund_application_fee: refundTarget.refundApplicationFee,
            },
        connectOpts,
      )
      refunded = true
    } catch (error) {
      if (!isStripeAlreadyRefunded(error)) {
        throw error
      }
      refunded = true
    }
  }

  if (!refunded) {
    throw new Error('Could not refund the sponsor payment.')
  }

  let canceled = false
  try {
    await stripe.subscriptions.cancel(input.subscriptionId, {}, connectOpts)
    canceled = true
  } catch (error) {
    if (!isStripeMissingResource(error)) {
      throw error
    }
    canceled = true
  }

  return { refunded, canceled }
}

export async function cancelStripeSubscription(subscriptionId: string, stripeAccountId: string) {
  const stripe = getStripe()
  try {
    await stripe.subscriptions.cancel(subscriptionId, {}, { stripeAccount: stripeAccountId })
  } catch (error) {
    if (!isStripeMissingResource(error)) {
      throw error
    }
  }
}

/** Stop renewals but keep access until current_period_end. */
export async function scheduleCancelStripeSubscriptionAtPeriodEnd(
  subscriptionId: string,
  stripeAccountId: string,
): Promise<{ currentPeriodEndIso: string | null }> {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true },
    { stripeAccount: stripeAccountId },
  )

  return { currentPeriodEndIso: stripeSubscriptionPeriodEndIso(subscription) }
}
