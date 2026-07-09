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
  syncConnectAccountStatus: vi.fn(),
}))

vi.mock('@/lib/sponsorship.server', () => ({
  getOrgStripeAccount: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: vi.fn(() => true),
}))

import { getOrgForMember } from '@/lib/orgs'
import { getAuthUser } from '@/lib/auth'
import { createConnectAccountLink, createConnectExpressAccount } from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'

describe('GET /api/console/[orgSlug]/sponsorship/connect', () => {
  beforeEach(() => {
    vi.mocked(getOrgForMember).mockReset()
    vi.mocked(getAuthUser).mockReset()
    vi.mocked(getOrgStripeAccount).mockReset()
    vi.mocked(createConnectExpressAccount).mockReset()
    vi.mocked(createConnectAccountLink).mockReset()
  })

  it('returns 401 without membership', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue(null)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 401 for non-interior operators', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({ id: 'org-1', slug: 'demo', name: 'Demo' } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'other-user' } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })
    expect(response.status).toBe(401)
  })

  it('redirects interior operators to Stripe onboarding', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      name: 'Demo',
    } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
    vi.mocked(getOrgStripeAccount).mockResolvedValue(null)
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
