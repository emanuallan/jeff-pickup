import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithDeadline, fetchWithTimeout } from './fetch-with-deadline'

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

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a 504 Response instead of throwing when the deadline fires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' })),
    )

    const response = await fetchWithTimeout(50)('https://example.test/db')
    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toEqual({ message: 'upstream timeout' })
  })
})
