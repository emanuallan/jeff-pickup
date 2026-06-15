import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withAuthCookieOptions } from '@/lib/tenancy/parse-host'

/**
 * Magic-link callback: exchange the auth code for a session and attach the
 * session cookies directly to the redirect response. Using cookies() from
 * next/headers here is unreliable — the session can be exchanged successfully
 * but never persisted, which sends the user back to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/console'
  const host = request.headers.get('host') ?? ''

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!code || !url || !key) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const redirectTo = `${origin}${next}`
  let response = NextResponse.redirect(redirectTo)

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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  return response
}
