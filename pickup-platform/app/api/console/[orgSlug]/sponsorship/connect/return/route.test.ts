import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { INTERIOR_OPERATOR_USER_ID } from '@/lib/interior'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/orgs', () => ({
  getOrgForMember: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/stripe-connect', () => ({
  syncConnectAccountForOrg: vi.fn(),
}))

import { getOrgForMember } from '@/lib/orgs'
import { getAuthUser } from '@/lib/auth'
import { syncConnectAccountForOrg } from '@/lib/stripe-connect'

describe('GET /api/console/[orgSlug]/sponsorship/connect/return', () => {
  beforeEach(() => {
    vi.mocked(getOrgForMember).mockReset()
    vi.mocked(getAuthUser).mockReset()
    vi.mocked(syncConnectAccountForOrg).mockReset()
  })

  it('redirects with connected=1 when charges are enabled', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({ id: 'org-1', slug: 'demo', name: 'Demo' } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
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
      'https://organizr.co/console/demo/sponsorship?connected=1',
    )
  })

  it('redirects with pending state when details are submitted but charges are disabled', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({ id: 'org-1', slug: 'demo', name: 'Demo' } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: INTERIOR_OPERATOR_USER_ID } as never)
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
      'https://organizr.co/console/demo/sponsorship?connected=1&connect_pending=1',
    )
  })
})
