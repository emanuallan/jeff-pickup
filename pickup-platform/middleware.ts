import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { safeNextPath } from '@/lib/safe-next'
import { getLegacyOrgPathRedirect } from '@/lib/legacy-org-path-redirect'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

const VISITOR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
}

/** Org public pages where anonymous visitors should get a stable key. */
function isPublicEventPage(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname === '/cal' || pathname === '/leaderboard') return true
  if (/^\/cal\/[^/]+$/.test(pathname)) return true
  if (/^\/org\/[^/]+$/.test(pathname)) return true
  if (/^\/org\/[^/]+\/cal$/.test(pathname)) return true
  if (/^\/org\/[^/]+\/cal\/[^/]+$/.test(pathname)) return true
  if (/^\/org\/[^/]+\/leaderboard$/.test(pathname)) return true
  return false
}

/** Legacy public URLs — redirect to the org home shell. */
function redirectLegacyOrgPaths(request: NextRequest): NextResponse | null {
  const target = getLegacyOrgPathRedirect(request.nextUrl.pathname)
  if (!target) return null

  const url = request.nextUrl.clone()
  url.pathname = target.pathname
  for (const [key, value] of Object.entries(target.searchParams)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url, 308)
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

/** Apex paths like /org/demo — public tenant pages. */
function isApexPublicOrgRoute(pathname: string): boolean {
  return /^\/org\/[^/]+(\/|$)/.test(pathname)
}

function applyVisitorCookie(
  response: NextResponse,
  isNewVisitor: boolean,
  visitorKey: string | null,
) {
  if (isNewVisitor && visitorKey) {
    response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)
  const pathname = request.nextUrl.pathname

  if (orgSlug) {
    const legacyRedirect = redirectLegacyOrgPaths(request)
    if (legacyRedirect) return legacyRedirect

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

    const sessionResponse = await updateSession(request)

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    response.headers.set('x-org-slug', orgSlug)
    copyCookies(sessionResponse.response, response)
    applyVisitorCookie(response, isNewVisitor, visitorKey)

    return response
  }

  if (isApexPublicOrgRoute(pathname)) {
    const legacyRedirect = redirectLegacyOrgPaths(request)
    if (legacyRedirect) return legacyRedirect

    const requestHeaders = new Headers(request.headers)
    const visitorKey = attachVisitorKey(request, requestHeaders)
    const isNewVisitor = visitorKey != null && !request.cookies.get(VISITOR_COOKIE)?.value

    const sessionResponse = await updateSession(request)

    const response = NextResponse.next({ request: { headers: requestHeaders } })
    copyCookies(sessionResponse.response, response)
    applyVisitorCookie(response, isNewVisitor, visitorKey)

    return response
  }

  const requestHeaders = new Headers(request.headers)
  const visitorKey = attachVisitorKey(request, requestHeaders)
  const isNewVisitor = visitorKey != null && !request.cookies.get(VISITOR_COOKIE)?.value

  const sessionResponse = await updateSession(request)

  if (pathname === '/login' && sessionResponse.user) {
    const destination = safeNextPath(request.nextUrl.searchParams.get('next'))
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url))
    copyCookies(sessionResponse.response, redirectResponse)
    applyVisitorCookie(redirectResponse, isNewVisitor, visitorKey)
    return redirectResponse
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  copyCookies(sessionResponse.response, response)
  applyVisitorCookie(response, isNewVisitor, visitorKey)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
