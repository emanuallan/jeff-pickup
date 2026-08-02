import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireOrgOwner } from './require-org-owner'

vi.mock('@/lib/orgs', () => ({
  getOrgForMember: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getOrgForMember } from '@/lib/orgs'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

describe('requireOrgOwner', () => {
  beforeEach(() => {
    vi.mocked(getOrgForMember).mockReset()
    vi.mocked(getAuthUser).mockReset()
    vi.mocked(createClient).mockReset()
  })

  it('returns null when the user is not a member', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue(null)
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1' } as never)
    await expect(requireOrgOwner('demo')).resolves.toBeNull()
  })

  it('returns null for non-owner members', async () => {
    vi.mocked(getOrgForMember).mockResolvedValue({ id: 'org-1', slug: 'demo' } as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'admin' } }),
            }),
          }),
        }),
      }),
    } as never)

    await expect(requireOrgOwner('demo')).resolves.toBeNull()
  })

  it('returns the org for owners', async () => {
    const org = { id: 'org-1', slug: 'demo', name: 'Demo' }
    vi.mocked(getOrgForMember).mockResolvedValue(org as never)
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'owner' } }),
            }),
          }),
        }),
      }),
    } as never)

    await expect(requireOrgOwner('demo')).resolves.toEqual(org)
  })
})
