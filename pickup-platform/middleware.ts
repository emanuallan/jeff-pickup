import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  parseOrgSlugFromHost,
  getAuthCookieDomain,
} from '@/lib/tenancy/parse-host'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)

  // Refresh the auth session on every request (apex AND subdomains) and write
  // the refreshed cookies with a shared domain so the organizer's session is
  // recognized on their org's public subdomain too.
  const cookieDomain = getAuthCookieDomain(host)
  const pendingCookies: {
    name: string
    value: string
    options?: Record<string, unknown>
  }[] = []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            pendingCookies.push({ name, value, options: { ...options, domain: cookieDomain } })
          })
        },
      },
    })

    // Required to refresh expiring sessions for Server Components.
    await supabase.auth.getUser()
  }

  // Subdomain tenant: rewrite to /org/[slug]/... (forwarding refreshed cookies).
  let response: NextResponse
  if (orgSlug) {
    const rewriteUrl = request.nextUrl.clone()
    const path = rewriteUrl.pathname === '/' ? '' : rewriteUrl.pathname
    rewriteUrl.pathname = `/org/${orgSlug}${path}`
    response = NextResponse.rewrite(rewriteUrl, { request: { headers: request.headers } })
    response.headers.set('x-org-slug', orgSlug)
  } else {
    response = NextResponse.next({ request })
  }

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     * Auth callback must be included for session refresh.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
