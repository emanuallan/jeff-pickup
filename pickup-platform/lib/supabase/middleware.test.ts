import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  fetchWithDeadline,
  hasSupabaseAuthCookie,
  updateSession,
} from './middleware'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

const createServerClientMock = vi.mocked(createServerClient)

function requestWithCookies(cookieHeader?: string) {
  return new NextRequest('https://jeff.organizr.co/', {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  })
}

describe('hasSupabaseAuthCookie', () => {
  it('is false when there are no cookies', () => {
    expect(hasSupabaseAuthCookie([])).toBe(false)
  })

  it('is false for participant and unrelated cookies', () => {
    expect(
      hasSupabaseAuthCookie([
        { name: 'hc_session' },
        { name: 'hc_visitor' },
      ]),
    ).toBe(false)
  })

  it('detects the session cookie and chunked shards', () => {
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token.0' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token.1' }])).toBe(true)
  })

  it('ignores the PKCE verifier cookie so a leftover OTP start cannot stall middleware', () => {
    expect(
      hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token-code-verifier' }]),
    ).toBe(false)
  })
})

describe('fetchWithDeadline', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the deadline signal when the caller has none', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const deadline = AbortSignal.timeout(5_000)
    await fetchWithDeadline(deadline)('https://example.test/auth')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBe(deadline)
  })

  it('aborts when the shared deadline fires', async () => {
    const deadline = AbortSignal.abort()
    await expect(fetchWithDeadline(deadline)('https://example.test/auth')).rejects.toThrow()
  })
})

describe('updateSession', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    createServerClientMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not call Auth when env is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    const result = await updateSession(requestWithCookies('sb-abcd-auth-token=x'))
    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(result.user).toBeNull()
  })

  it('skips getUser for anonymous org-page visitors', async () => {
    const result = await updateSession(requestWithCookies('hc_session=abc'))
    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(result.user).toBeNull()
  })

  it('returns the Auth user when a session cookie is present', async () => {
    const user = { id: 'user-1' }
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    } as never)

    const result = await updateSession(requestWithCookies('sb-abcd-auth-token=jwt'))
    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    expect(result.user).toEqual(user)
  })

  it('fails open when getUser hangs or throws so middleware cannot 504', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('The operation was aborted')),
      },
    } as never)

    const result = await updateSession(requestWithCookies('sb-abcd-auth-token=jwt'))
    expect(result.user).toBeNull()
  })

  it('injects a deadline fetch so Auth cannot hold the Edge invocation', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    await updateSession(requestWithCookies('sb-abcd-auth-token=jwt'))

    const options = createServerClientMock.mock.calls[0]?.[2] as {
      global?: { fetch?: typeof fetch }
    }
    expect(typeof options.global?.fetch).toBe('function')
  })
})
