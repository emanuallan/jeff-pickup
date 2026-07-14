import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { INTERIOR_OPERATOR_USER_ID } from '@/lib/interior'

vi.mock('@/lib/orgs', () => ({
  getOrgForMember: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/stripe-connect', () => ({
  createConnectExpressAccount: vi.fn(),
  createConnectAccountLink: vi.fn(),
  findStripeAccountIdForOrg: vi.fn(),
  syncConnectAccountStatus: vi.fn(),
  syncOrgBrandingToConnectAccount: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/sponsorship.server', () => ({
  getOrgStripeAccount: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: vi.fn(() => true),
}))

import { getOrgForMember } from '@/lib/orgs'
import { getAuthUser } from '@/lib/auth'
import { createConnectAccountLink, createConnectExpressAccount, findStripeAccountIdForOrg } from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'

describe('GET /api/console/[orgSlug]/sponsorship/connect', () => {
  beforeEach(() => {
    vi.mocked(getOrgForMember).mockReset()
    vi.mocked(getAuthUser).mockReset()
    vi.mocked(getOrgStripeAccount).mockReset()
    vi.mocked(createConnectExpressAccount).mockReset()
    vi.mocked(findStripeAccountIdForOrg).mockReset()
    vi.mocked(isStripeConfigured).mockReturnValue(true)
  })

  it('redirects to console when Stripe is not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/sponsorship/setup?connect_error=stripe_not_configured',
    )
  })

  it('redirects to console without membership', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue(null)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/sponsorship/setup?connect_error=unauthorized',
    )
  })

  it('redirects to console for non-interior operators', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({ id: 'org-1', slug: 'demo', name: 'Demo' } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'other-user' } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/sponsorship/setup?connect_error=unauthorized',
    )
  })

  it('redirects interior operators to Stripe onboarding', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      name: 'Demo',
      branding: { logo_url: null, accent_color: '#2563eb', links: [] },
    } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
    vi.mocked(getOrgStripeAccount).mockResolvedValue(null)
    vi.mocked(findStripeAccountIdForOrg).mockResolvedValue(null)
    vi.mocked(createConnectExpressAccount).mockResolvedValue({
      id: 'acct_123',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    } as never)
    vi.mocked(createConnectAccountLink).mockResolvedValue({ url: 'https://stripe.test/onboard' } as never)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://stripe.test/onboard')
  })
})
