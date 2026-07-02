import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

/**
 * Supabase client for Route Handlers. Session cookies must be written to both
 * the cookie store and the outgoing response or redirects won't carry the session.
 */
export async function createRouteHandlerClient(response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}
