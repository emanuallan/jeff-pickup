import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

vi.mock('@/lib/sponsorship.server', () => ({
  getOrgStripeAccount: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

import { getPublicOrgBySlug } from '@/lib/public-data'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

describe('POST /api/sponsorship/checkout', () => {
  beforeEach(() => {
    vi.mocked(getPublicOrgBySlug).mockReset()
    vi.mocked(getOrgStripeAccount).mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  })

  it('rejects missing logo', async () => {
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      settings: { features: { group_sponsorships: true } },
    } as never)
    vi.mocked(getOrgStripeAccount).mockResolvedValue({
      stripe_account_id: 'acct_1',
      charges_enabled: true,
    } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'demo',
          tierId: 'tier-1',
          sponsorName: 'Acme',
          logoUrl: '',
        }),
      }),
    )
    expect(response.status).toBe(400)
  })

  it('creates checkout session', async () => {
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      settings: { features: { group_sponsorships: true } },
    } as never)
    vi.mocked(getOrgStripeAccount).mockResolvedValue({
      stripe_account_id: 'acct_1',
      charges_enabled: true,
    } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'tier-1',
                  stripe_price_id: 'price_1',
                  price_cents: 2500,
                  currency: 'usd',
                  status: 'active',
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as never)
    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }),
        },
      },
    } as never)

    const logoUrl =
      'https://example.supabase.co/storage/v1/object/public/organizr_public/sponsor-logos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/logo_20260101120000_ab12cd.png'

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'demo',
          tierId: 'tier-1',
          sponsorName: 'Acme',
          logoUrl,
        }),
      }),
    )
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.url).toBe('https://checkout.stripe.test/session')
  })
})
