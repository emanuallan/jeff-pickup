import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

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
