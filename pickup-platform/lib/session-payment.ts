import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { clampGuestCount } from '@/lib/guest-signups'
import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  formatPlatformFeePercent,
} from '@/lib/sponsorship'

export async function completePaidEventJoinFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (session.metadata?.checkout_kind !== 'session_payment') {
    return { ok: false, reason: 'not_session_payment' }
  }

  const checkoutSessionId = session.id
  if (!checkoutSessionId) {
    return { ok: false, reason: 'missing_session_id' }
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const admin = createAdminClient()
  const { error } = await admin.rpc('complete_paid_event_join', {
    p_stripe_checkout_session_id: checkoutSessionId,
    p_stripe_payment_intent_id: paymentIntentId,
  })

  if (error) {
    console.error('complete_paid_event_join failed', error.message)
    return { ok: false, reason: error.message }
  }

  return { ok: true }
}

/** Backup when Connect webhooks lag — sync checkout completion on return URL. */
export async function syncSessionPaymentCheckoutForOrg(
  orgId: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient()
  const { data: stripeAccount } = await admin
    .from('org_stripe_accounts')
    .select('stripe_account_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!stripeAccount?.stripe_account_id) {
    return { ok: false, reason: 'stripe_account_missing' }
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: stripeAccount.stripe_account_id },
  )

  if (session.status !== 'complete' && session.payment_status !== 'paid') {
    return { ok: false, reason: 'incomplete' }
  }

  if (session.metadata?.org_id !== orgId) {
    return { ok: false, reason: 'org_mismatch' }
  }

  return completePaidEventJoinFromCheckout(session)
}

export function formatPriceCents(cents: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export function isPaidSession(priceCents: number | null | undefined): boolean {
  return (priceCents ?? 0) > 0
}

/** Joiner + guests — paid sessions charge per person. */
export function paidSessionHeadcount(guestCount: number): number {
  return 1 + clampGuestCount(guestCount)
}

/** Total charge in cents: session fee × (you + guests). */
export function sessionPaymentTotalCents(
  priceCentsPerPerson: number,
  guestCount: number,
): number {
  if (!Number.isFinite(priceCentsPerPerson) || priceCentsPerPerson <= 0) return 0
  return Math.round(priceCentsPerPerson) * paidSessionHeadcount(guestCount)
}

/** Platform cut taken from the connected account via Stripe application_fee_amount. */
export function sessionPaymentPlatformFeeCents(
  amountCents: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  const pct = Number.isFinite(platformFeePercent)
    ? platformFeePercent
    : DEFAULT_PLATFORM_FEE_PERCENT
  return Math.max(0, Math.round((amountCents * pct) / 100))
}

/** What the group keeps after the platform fee (before Stripe card processing). */
export function sessionPaymentOrganizerShareCents(
  amountCents: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0
  return Math.max(
    0,
    Math.round(amountCents) - sessionPaymentPlatformFeeCents(amountCents, platformFeePercent),
  )
}

/** Official Stripe pricing page — fees vary by country and payment method. */
export const STRIPE_PROCESSING_FEES_URL = 'https://stripe.com/pricing'

/** Console copy for organizers setting a per-person session fee (link Stripe fees in UI). */
export function sessionFeeOrganizerPayoutHint(
  priceCents: number | null,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): string {
  const feeLabel = formatPlatformFeePercent(platformFeePercent)
  if (priceCents == null || priceCents <= 0) {
    return `Leave blank for free. For paid sessions, players pay the fee you set. Organizr keeps ${feeLabel}% from each payment; Stripe also deducts card processing fees from your payout.`
  }

  const charge = formatPriceCents(priceCents)
  const platformFee = formatPriceCents(
    sessionPaymentPlatformFeeCents(priceCents, platformFeePercent),
  )
  const share = formatPriceCents(
    sessionPaymentOrganizerShareCents(priceCents, platformFeePercent),
  )
  return `Players pay ${charge}. Organizr keeps ${feeLabel}% (${platformFee}), so about ${share} reaches your Stripe balance before Stripe deducts card processing fees.`
}
