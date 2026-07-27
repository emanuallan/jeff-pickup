import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('DELETE /api/participant/session', () => {
  const rpcMock = vi.fn()

  beforeEach(() => {
    rpcMock.mockReset()
    rpcMock.mockResolvedValue({ data: true, error: null })
    vi.mocked(createClient).mockResolvedValue({
      rpc: rpcMock,
    } as never)
  })

  it('expires hc_session with the same attributes used when setting it', async () => {
    const request = new NextRequest('http://localhost/api/participant/session', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

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
  })

  it('still clears the cookie when revoke RPC fails', async () => {
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
  })
})
