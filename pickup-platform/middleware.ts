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

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value, cookie)
  }
}

function attachVisitorKey(request: NextRequest, requestHeaders: Headers): string | null {
  if (!isPublicEventPage(request.nextUrl.pathname)) {
    return null
  }

  const visitorKey = request.cookies.get(VISITOR_COOKIE)?.value ?? crypto.randomUUID()
  requestHeaders.set('x-visitor-key', visitorKey)
  return visitorKey
}

/** Apex paths like /org/demo/events — public tenant pages, no auth refresh needed. */
function isApexPublicOrgRoute(pathname: string): boolean {
  return /^\/org\/[^/]+(\/|$)/.test(pathname)
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)
  const pathname = request.nextUrl.pathname

  if (orgSlug) {
    if (
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/console')
    ) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    const path = pathname === '/' ? '' : pathname
    url.pathname = `/org/${orgSlug}${path}`

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-org-slug', orgSlug)
    const visitorKey = attachVisitorKey(request, requestHeaders)
    const isNewVisitor = visitorKey != null && !request.cookies.get(VISITOR_COOKIE)?.value

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    response.headers.set('x-org-slug', orgSlug)

    if (isNewVisitor && visitorKey) {
      response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
    }

    return response
  }

  if (isApexPublicOrgRoute(pathname)) {
    const requestHeaders = new Headers(request.headers)
    const visitorKey = attachVisitorKey(request, requestHeaders)
    const isNewVisitor = visitorKey != null && !request.cookies.get(VISITOR_COOKIE)?.value

    const response = NextResponse.next({ request: { headers: requestHeaders } })

    if (isNewVisitor && visitorKey) {
      response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
    }

    return response
  }

  const requestHeaders = new Headers(request.headers)
  const visitorKey = attachVisitorKey(request, requestHeaders)
  const isNewVisitor = visitorKey != null && !request.cookies.get(VISITOR_COOKIE)?.value

  const sessionResponse = await updateSession(request)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  copyCookies(sessionResponse, response)

  if (isNewVisitor && visitorKey) {
    response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
