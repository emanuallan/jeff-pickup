import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, POST } from './route'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

describe('POST /api/participant/session', () => {
  const rpcMock = vi.fn()

  function postRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/participant/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    rpcMock.mockReset()
    rpcMock.mockResolvedValue({
      data: { session_token: '33333333-3333-3333-3333-333333333333' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ rpc: rpcMock } as never)
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({ id: 'org-1' } as never)
  })

  it('saves a soft participant and sets the device session cookie', async () => {
    const response = await POST(
      postRequest({
        slug: 'demo',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '2025550101',
      }),
    )

    expect(response.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('ensure_soft_participant', {
      p_org_id: 'org-1',
      p_phone: '12025550101',
      p_first_name: 'Ada',
      p_last_name: 'Lovelace',
      p_email: null,
    })

    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${SESSION_COOKIE}=33333333-3333-3333-3333-333333333333`)
    expect(setCookie).toContain('HttpOnly')
  })

  it('rejects incomplete profiles without touching the database', async () => {
    const response = await POST(
      postRequest({ slug: 'demo', firstName: 'Ada', lastName: '', phone: '2025550101' }),
    )

    expect(response.status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('surfaces RPC failures', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Invalid phone number' } })

    const response = await POST(
      postRequest({
        slug: 'demo',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '2025550101',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid phone number' })
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})

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
