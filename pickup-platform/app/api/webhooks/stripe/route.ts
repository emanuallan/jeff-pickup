import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, stripeWebhookSecret } from '@/lib/stripe'

export const runtime = 'nodejs'

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {}
  const orgId = metadata.org_id
  const tierId = metadata.tier_id
  const sponsorName = metadata.sponsor_name
  const logoUrl = metadata.logo_url

  if (!orgId || !tierId || !sponsorName || !logoUrl || !session.subscription) {
    return
  }

  const admin = createAdminClient()
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id

  await admin.rpc('upsert_sponsorship_from_checkout', {
    p_org_id: orgId,
    p_tier_id: tierId,
    p_sponsor_name: sponsorName,
    p_logo_url: logoUrl,
    p_sponsor_url: metadata.sponsor_url ?? null,
    p_sponsor_message: metadata.sponsor_message ?? null,
    p_contact_email: session.customer_details?.email ?? session.customer_email ?? '',
    p_stripe_customer_id:
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    p_stripe_subscription_id: subscriptionId,
    p_stripe_checkout_session_id: session.id,
    p_monthly_amount_cents: Number(metadata.monthly_amount_cents ?? 0),
    p_currency: metadata.currency ?? 'usd',
    p_platform_fee_percent: Number(metadata.platform_fee_percent ?? 5),
    p_subscription_status: 'active',
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  let sponsorshipStatus: string | null = null

  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    sponsorshipStatus = 'canceled'
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    sponsorshipStatus = 'payment_failed'
  } else if (subscription.status === 'active' || subscription.status === 'trialing') {
    sponsorshipStatus = null
  }

  await admin.rpc('update_sponsorship_subscription_status', {
    p_stripe_subscription_id: subscription.id,
    p_subscription_status: subscription.status,
    p_sponsorship_status: sponsorshipStatus,
  })
}

async function handleAccountUpdated(account: Stripe.Account) {
  const orgId = account.metadata?.org_id
  if (!orgId) return

  const admin = createAdminClient()
  await admin.rpc('upsert_org_stripe_account', {
    p_org_id: orgId,
    p_stripe_account_id: account.id,
    p_charges_enabled: account.charges_enabled ?? false,
    p_payouts_enabled: account.payouts_enabled ?? false,
    p_details_submitted: account.details_submitted ?? false,
  })
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
    .subscription
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'id' in raw) return raw.id
  return null
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret())
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = subscriptionIdFromInvoice(invoice)
        if (subscriptionId) {
          const admin = createAdminClient()
          await admin.rpc('update_sponsorship_subscription_status', {
            p_stripe_subscription_id: subscriptionId,
            p_subscription_status: 'past_due',
            p_sponsorship_status: 'payment_failed',
          })
        }
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = subscriptionIdFromInvoice(invoice)
        if (subscriptionId) {
          const admin = createAdminClient()
          await admin.rpc('update_sponsorship_subscription_status', {
            p_stripe_subscription_id: subscriptionId,
            p_subscription_status: 'active',
            p_sponsorship_status: null,
          })
        }
        break
      }
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break
      default:
        break
    }
  } catch {
    return new Response('Webhook handler failed', { status: 500 })
  }

  return NextResponse.json({ received: true })
}
