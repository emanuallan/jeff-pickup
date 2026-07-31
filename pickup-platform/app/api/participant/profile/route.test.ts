import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

describe('PATCH /api/participant/profile', () => {
  const rpcMock = vi.fn()
  const token = '11111111-1111-1111-1111-111111111111'

  function patchRequest(body: Record<string, unknown>, withCookie = true) {
    return new NextRequest('http://localhost/api/participant/profile', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(withCookie ? { cookie: `${SESSION_COOKIE}=${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    rpcMock.mockReset()
    rpcMock.mockResolvedValue({
      data: {
        participant_id: 'part-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        display_name: 'Ada L.',
        email: 'ada@example.com',
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ rpc: rpcMock } as never)
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({ id: 'org-1' } as never)
  })

  it('updates name and email via session-authorized RPC without touching phone', async () => {
    const response = await PATCH(
      patchRequest({
        slug: 'demo',
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada L.',
        email: 'ada@example.com',
      }),
    )

    expect(response.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('update_soft_participant_profile', {
      p_session_token: token,
      p_org_id: 'org-1',
      p_first_name: 'Ada',
      p_last_name: 'Lovelace',
      p_display_name: 'Ada L.',
      p_email: 'ada@example.com',
    })
    const args = rpcMock.mock.calls[0]?.[1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_phone')
  })

  it('rejects missing session', async () => {
    const response = await PATCH(
      patchRequest(
        { slug: 'demo', firstName: 'Ada', lastName: 'Lovelace' },
        false,
      ),
    )

    expect(response.status).toBe(401)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rejects incomplete names without calling RPC', async () => {
    const response = await PATCH(
      patchRequest({ slug: 'demo', firstName: 'Ada', lastName: '' }),
    )

    expect(response.status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('surfaces RPC failures (e.g. wrong/expired session)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Session expired' } })

    const response = await PATCH(
      patchRequest({ slug: 'demo', firstName: 'Ada', lastName: 'Lovelace' }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Session expired' })
  })

  it('clears email when empty', async () => {
    await PATCH(
      patchRequest({
        slug: 'jeffsoccer',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: '   ',
      }),
    )

    expect(rpcMock).toHaveBeenCalledWith(
      'update_soft_participant_profile',
      expect.objectContaining({ p_email: null }),
    )
  })
})
