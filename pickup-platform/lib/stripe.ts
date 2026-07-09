import Stripe from 'stripe'
import { DEFAULT_PLATFORM_FEE_PERCENT } from '@/lib/sponsorship'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2026-06-24.dahlia',
      typescript: true,
    })
  }

  return stripeClient
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}

export function getPlatformFeePercent(): number {
  const raw = process.env.PLATFORM_FEE_PERCENT
  const parsed = raw ? Number(raw) : DEFAULT_PLATFORM_FEE_PERCENT
  return Number.isFinite(parsed) ? parsed : DEFAULT_PLATFORM_FEE_PERCENT
}

export function stripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  }
  return secret
}
