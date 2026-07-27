import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { DELETE } from './route'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'
import { createClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/route-handler', () => ({
  createRouteHandlerClient: vi.fn(),
}))

describe('DELETE /api/participant/session', () => {
  const rpcMock = vi.fn()
  const signOutMock = vi.fn()

  beforeEach(() => {
    rpcMock.mockReset()
    signOutMock.mockReset()
    rpcMock.mockResolvedValue({ data: true, error: null })
    signOutMock.mockResolvedValue({ error: null })
    vi.mocked(createClient).mockResolvedValue({
      rpc: rpcMock,
    } as never)
    vi.mocked(createRouteHandlerClient).mockResolvedValue({
      auth: { signOut: signOutMock },
    } as never)
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    } as never)
  })

  it('expires hc_session with the same attributes used when setting it', async () => {
    const request = new NextRequest('http://localhost/api/participant/session', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'global' })

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

  it('revokes the participant_sessions row for the current cookie token', async () => {
    const token = '11111111-1111-1111-1111-111111111111'
    const request = new NextRequest('http://localhost/api/participant/session', {
      method: 'DELETE',
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    })

    const response = await DELETE(request)

    expect(response.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('clear_participant_device_session', {
      p_session_token: token,
    })
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('still clears cookies when revoke RPC fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'function missing' } })
    const token = '22222222-2222-2222-2222-222222222222'
    const request = new NextRequest('http://localhost/api/participant/session', {
      method: 'DELETE',
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    })

    const response = await DELETE(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie') ?? '').toContain(`${SESSION_COOKIE}=`)
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('expires auth cookies alongside the soft session', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue([{ name: 'sb-abc-auth-token', value: 'x' }]),
      set: vi.fn(),
    } as never)

    const request = new NextRequest('http://localhost/api/participant/session', {
      method: 'DELETE',
      headers: {
        cookie: 'sb-abc-auth-token=x',
      },
    })

    const response = await DELETE(request)
    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('sb-abc-auth-token=')
    expect(setCookie).toContain(`${SESSION_COOKIE}=`)
  })
})
