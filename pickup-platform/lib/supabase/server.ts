import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { withAuthCookieOptions } from '@/lib/tenancy/parse-host'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const host = headerStore.get('host') ?? ''

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, withAuthCookieOptions(host, options))
          })
        } catch {
          // setAll can fail in Server Components — middleware handles refresh
        }
      },
    },
  })
}
