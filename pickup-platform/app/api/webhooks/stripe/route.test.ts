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
})
