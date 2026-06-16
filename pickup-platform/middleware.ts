import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

const VISITOR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
}

/** Org public event detail pages (subdomain path or apex rewrite path). */
function isPublicEventPage(pathname: string): boolean {
  return (
    /^\/events\/[^/]+/.test(pathname) ||
    /^\/org\/[^/]+\/events\/[^/]+/.test(pathname)
  )
}

function withVisitorContext(request: NextRequest, response: NextResponse): NextResponse {
  if (!isPublicEventPage(request.nextUrl.pathname)) {
    return response
  }

  let visitorKey = request.cookies.get(VISITOR_COOKIE)?.value ?? null
  if (!visitorKey) {
    visitorKey = crypto.randomUUID()
    response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
  }

  response.headers.set('x-visitor-key', visitorKey)
  return response
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)
  const pathname = request.nextUrl.pathname

  // Subdomain tenant: rewrite to /org/[slug]/...
  if (orgSlug) {
    // API, auth, and console routes are not org-scoped rewrites.
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/console')
    ) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    const path = pathname === '/' ? '' : pathname
    url.pathname = `/org/${orgSlug}${path}`
    const rewriteResponse = NextResponse.rewrite(url)
    rewriteResponse.headers.set('x-org-slug', orgSlug)
    return withVisitorContext(request, rewriteResponse)
  }

  const sessionResponse = await updateSession(request)
  return withVisitorContext(request, sessionResponse)
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
