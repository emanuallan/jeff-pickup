import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

vi.mock('@/lib/sponsorship.server', () => ({}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

import { getPublicOrgBySlug } from '@/lib/public-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

function mockAdminClient({
  stripeAccount = { stripe_account_id: 'acct_1', charges_enabled: true },
  tier = {
    id: 'tier-1',
    stripe_price_id: 'price_1',
    price_cents: 2500,
    currency: 'usd',
    status: 'active',
  },
}: {
  stripeAccount?: { stripe_account_id: string; charges_enabled: boolean } | null
  tier?: Record<string, unknown> | null
} = {}) {
  vi.mocked(createAdminClient).mockReturnValue({
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          if (table === 'org_stripe_accounts') {
            return {
              maybeSingle: vi.fn().mockResolvedValue({ data: stripeAccount, error: null }),
            }
          }
          if (table === 'sponsorship_tiers' && column === 'id') {
            return {
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: tier, error: null }),
              }),
            }
          }
          return {
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        },
      }),
    }),
  } as never)
}

describe('POST /api/sponsorship/checkout', () => {
  beforeEach(() => {
    vi.mocked(getPublicOrgBySlug).mockReset()
    vi.mocked(createAdminClient).mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  })

  it('rejects missing logo', async () => {
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      settings: { features: { group_sponsorships: true } },
    } as never)
    mockAdminClient()

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
    mockAdminClient()
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
