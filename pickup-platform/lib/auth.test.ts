import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(),
    }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(),
    }))
  })

  it('does not call Auth when there is no Supabase session cookie', async () => {
    const { cookies } = await import('next/headers')
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(cookies).mockResolvedValue({
      getAll: () => [{ name: 'hc_session', value: 'abc' }],
    } as never)

    const { getAuthUser } = await import('./auth')
    await expect(getAuthUser()).resolves.toBeNull()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('loads the user when a session cookie is present', async () => {
    const { cookies } = await import('next/headers')
    const { createClient } = await import('@/lib/supabase/server')
    const user = { id: 'user-1' }
    vi.mocked(cookies).mockResolvedValue({
      getAll: () => [{ name: 'sb-abcd-auth-token', value: 'jwt' }],
    } as never)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    } as never)

    const { getAuthUser } = await import('./auth')
    await expect(getAuthUser()).resolves.toEqual(user)
  })
})
