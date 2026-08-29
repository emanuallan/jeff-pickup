import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseCookieOptions } from './cookie-options'

export type SessionUpdate = {
  response: NextResponse
  user: User | null
}

/** Keep well under Vercel's middleware wall-clock limit (Hobby is 5s). */
export const SESSION_FETCH_TIMEOUT_MS = 3000

/**
 * True when the request has a Supabase access/refresh cookie that would make
 * `getUser()` hit Auth over the network. PKCE verifier cookies do not count.
 */
export function hasSupabaseAuthCookie(cookies: { name: string }[]): boolean {
  return cookies.some((cookie) => {
    const { name } = cookie
    if (!name.startsWith('sb-')) return false
    return /(^|-)auth-token(?:\.\d+)?$/.test(name)
  })
}

/** Bind every Auth fetch in this middleware invocation to one shared deadline. */
export function fetchWithDeadline(deadline: AbortSignal) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const signal =
      init?.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, deadline])
        : deadline
    return fetch(input, { ...init, signal })
  }
}

export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { response: supabaseResponse, user: null }
  }

  // Anonymous traffic (public org pages) must not wait on Auth. A hung
  // getUser() is what produces Vercel 504 MIDDLEWARE_INVOCATION_TIMEOUT.
  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    return { response: supabaseResponse, user: null }
  }

  const deadline = AbortSignal.timeout(SESSION_FETCH_TIMEOUT_MS)

  const supabase = createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    global: {
      fetch: fetchWithDeadline(deadline),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return { response: supabaseResponse, user }
  } catch {
    // Fail open: treat as logged-out so the rewrite/page still runs.
    return { response: supabaseResponse, user: null }
  }
}
