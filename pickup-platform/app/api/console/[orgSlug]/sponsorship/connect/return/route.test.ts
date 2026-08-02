import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/console/require-org-owner', () => ({
  requireOrgOwner: vi.fn(),
}))

vi.mock('@/lib/stripe-connect', () => ({
  syncConnectAccountForOrg: vi.fn(),
  syncOrgBrandingToConnectAccount: vi.fn().mockResolvedValue(undefined),
}))

import { requireOrgOwner } from '@/lib/console/require-org-owner'
import { syncConnectAccountForOrg } from '@/lib/stripe-connect'

describe('GET /api/console/[orgSlug]/sponsorship/connect/return', () => {
  beforeEach(() => {
    vi.mocked(requireOrgOwner).mockReset()
    vi.mocked(syncConnectAccountForOrg).mockReset()
  })

  it('redirects with connected=1 when charges are enabled', async () => {
    vi.mocked(requireOrgOwner).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      name: 'Demo',
      branding: { logo_url: null, accent_color: '#2563eb', links: [] },
    } as never)
    vi.mocked(syncConnectAccountForOrg).mockResolvedValue({
      id: 'acct_123',
      charges_enabled: true,
      details_submitted: true,
    } as never)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/payments?connected=1',
    )
  })

  it('redirects with pending state when details are submitted but charges are disabled', async () => {
    vi.mocked(requireOrgOwner).mockResolvedValue({
      id: 'org-1',
      slug: 'demo',
      name: 'Demo',
      branding: { logo_url: null, accent_color: '#2563eb', links: [] },
    } as never)
    vi.mocked(syncConnectAccountForOrg).mockResolvedValue({
      id: 'acct_123',
      charges_enabled: false,
      details_submitted: true,
    } as never)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/payments?connected=1&connect_pending=1',
    )
  })

  it('redirects unauthorized users to payments with an error', async () => {
    vi.mocked(requireOrgOwner).mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://organizr.co/console/demo/payments?connect_error=unauthorized',
    )
  })
})
