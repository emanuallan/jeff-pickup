import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withAuthCookieOptions } from '@/lib/tenancy/parse-host'

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)
  const host = request.headers.get('host') ?? ''

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let response = NextResponse.redirect(`${origin}/`)

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, withAuthCookieOptions(host, options))
          })
        },
      },
    })
    await supabase.auth.signOut()
  }

  return response
}
