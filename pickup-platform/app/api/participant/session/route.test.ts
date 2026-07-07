import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cookies } from 'next/headers'
import { DELETE } from './route'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('DELETE /api/participant/session', () => {
  beforeEach(() => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: vi.fn(),
    } as never)
  })

  it('expires hc_session with the same attributes used when setting it', async () => {
    const response = await DELETE()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })

    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${SESSION_COOKIE}=`)
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toMatch(/SameSite=lax/i)

    const opts = getParticipantCookieOptions()
    if (opts.secure) {
      expect(setCookie).toContain('Secure')
    }
  })
})
