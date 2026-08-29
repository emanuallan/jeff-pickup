/** Bound for public/org SSR fetches — stay under Vercel function/middleware limits. */
export const PUBLIC_FETCH_TIMEOUT_MS = 3000

/** Bind every fetch in one invocation to a shared deadline (throws on abort). */
export function fetchWithDeadline(deadline: AbortSignal) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const signal =
      init?.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, deadline])
        : deadline
    return fetch(input, { ...init, signal })
  }
}

/**
 * Per-call timeout. Aborts become a 504 Response so supabase-js surfaces an
 * error instead of hanging the RSC stream until the platform 504s.
 */
export function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs)
    const signal =
      init?.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, timeout])
        : timeout
    try {
      return await fetch(input, { ...init, signal })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') {
        return new Response(JSON.stringify({ message: 'upstream timeout' }), {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw error
    }
  }
}
