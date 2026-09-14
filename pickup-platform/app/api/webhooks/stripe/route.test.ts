import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  stripeWebhookSecret: vi.fn(() => 'whsec_test'),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.mocked(getStripe).mockReset()
    vi.mocked(createAdminClient).mockReset()
  })

  it('rejects missing signature', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: '{}' }))
    expect(response.status).toBe(400)
  })

  it('handles checkout.session.completed', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'id-1', error: null })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_1',
              subscription: 'sub_1',
              customer: 'cus_1',
              customer_details: { email: 'sponsor@example.com' },
              metadata: {
                org_id: 'org-1',
                tier_id: 'tier-1',
                sponsor_name: 'Acme',
                logo_url: 'https://example.com/logo.png',
                monthly_amount_cents: '2500',
                currency: 'usd',
                platform_fee_percent: '5',
              },
            },
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'sig' },
      }),
    )
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('upsert_sponsorship_from_checkout', expect.any(Object))
  })

  it('fulfills a session payment when async payment succeeds', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.async_payment_succeeded',
          data: {
            object: {
              id: 'cs_cashapp',
              payment_status: 'paid',
              payment_intent: 'pi_1',
              metadata: { checkout_kind: 'session_payment' },
            },
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'sig' },
      }),
    )
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('complete_paid_event_join', {
      p_stripe_checkout_session_id: 'cs_cashapp',
      p_stripe_payment_intent_id: 'pi_1',
    })
  })

  it('does not roster a session payment while checkout is still unpaid', async () => {
    const rpc = vi.fn()
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_cashapp',
              payment_status: 'unpaid',
              payment_intent: 'pi_1',
              metadata: { checkout_kind: 'session_payment' },
            },
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'sig' },
      }),
    )
    expect(response.status).toBe(200)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('marks a pending session payment failed when async payment fails', async () => {
    const eqStatus = vi.fn().mockResolvedValue({ error: null })
    const eqSession = vi.fn().mockReturnValue({ eq: eqStatus })
    const update = vi.fn().mockReturnValue({ eq: eqSession })
    const from = vi.fn().mockReturnValue({ update })
    vi.mocked(createAdminClient).mockReturnValue({ from } as never)
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.async_payment_failed',
          data: {
            object: {
              id: 'cs_cashapp',
              metadata: { checkout_kind: 'session_payment' },
            },
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'sig' },
      }),
    )
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('event_payments')
    expect(update).toHaveBeenCalledWith({ status: 'failed' })
    expect(eqSession).toHaveBeenCalledWith('stripe_checkout_session_id', 'cs_cashapp')
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending')
  })
})
