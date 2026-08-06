import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOrgForMember } from './orgs'

describe('getOrgForMember', () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockReset()
    vi.mocked(createClient).mockReset()
  })

  it('skips org and membership lookups for anonymous visitors', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    await expect(getOrgForMember('anon-demo')).resolves.toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns the org when the signed-in user is a member', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'user-1' } as never)
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 'org-1',
          slug: 'member-demo',
          name: 'Demo FC',
          description: '',
          status: 'active',
          default_locale: 'en',
          branding: { accent_color: '#22c55e', logo_url: null, links: [] },
          settings: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      })
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle }),
            maybeSingle,
          }),
        }),
      }),
    } as never)

    const org = await getOrgForMember('member-demo')
    expect(org?.slug).toBe('member-demo')
    expect(org?.name).toBe('Demo FC')
  })
})