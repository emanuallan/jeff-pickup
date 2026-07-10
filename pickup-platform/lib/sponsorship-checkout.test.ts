import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildSponsorshipCheckoutRpcPayload,
  syncSponsorshipCheckoutForOrg,
  upsertSponsorshipFromCheckoutSession,
} from '@/lib/sponsorship-checkout'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

const completeSession = {
  id: 'cs_test_1',
  status: 'complete',
  subscription: 'sub_test_1',
  customer: 'cus_test_1',
  customer_details: { email: 'sponsor@example.com' },
  metadata: {
    org_id: 'org-1',
    tier_id: 'tier-1',
    sponsor_name: 'Acme Co',
    logo_url: 'https://example.com/logo.png',
    sponsor_url: 'https://acme.test',
    sponsor_message: 'Great group',
    monthly_amount_cents: '2500',
    currency: 'usd',
    platform_fee_percent: '5',
  },
} as const

describe('buildSponsorshipCheckoutRpcPayload', () => {
  it('builds rpc payload from checkout metadata', () => {
    const payload = buildSponsorshipCheckoutRpcPayload(completeSession)
    expect(payload).toMatchObject({
      p_org_id: 'org-1',
      p_tier_id: 'tier-1',
      p_sponsor_name: 'Acme Co',
      p_stripe_checkout_session_id: 'cs_test_1',
      p_stripe_subscription_id: 'sub_test_1',
      p_subscription_status: 'active',
    })
  })

  it('returns null when required metadata is missing', () => {
    expect(
      buildSponsorshipCheckoutRpcPayload({
        ...completeSession,
        metadata: { org_id: 'org-1' },
      } as never),
    ).toBeNull()
  })
})

describe('upsertSponsorshipFromCheckoutSession', () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset()
  })

  it('throws when rpc fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }),
    } as never)

    await expect(upsertSponsorshipFromCheckoutSession(completeSession as never)).rejects.toThrow(
      /upsert_sponsorship_from_checkout failed/,
    )
  })
})

describe('syncSponsorshipCheckoutForOrg', () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset()
    vi.mocked(getStripe).mockReset()
  })

  it('retrieves the connected-account checkout session and upserts sponsorship', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { stripe_account_id: 'acct_test_1' },
              error: null,
            }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: 'sponsorship-1', error: null }),
    } as never)

    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue(completeSession),
        },
      },
    } as never)

    const result = await syncSponsorshipCheckoutForOrg('org-1', 'cs_test_1')
    expect(result).toEqual({ ok: true, id: 'sponsorship-1' })
    expect(getStripe().checkout.sessions.retrieve).toHaveBeenCalledWith(
      'cs_test_1',
      { expand: ['subscription', 'customer'] },
      { stripeAccount: 'acct_test_1' },
    )
  })
})
