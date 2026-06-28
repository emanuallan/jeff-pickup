import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { safeNextPath } from '@/lib/safe-next'
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
    /^\/cal\/[^/]+/.test(pathname) ||
    /^\/org\/[^/]+\/cal\/[^/]+/.test(pathname)
  )
}

/** Legacy /events URLs — redirect to /cal so shared links and OG caches keep working. */
function redirectEventsToCal(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  if (pathname === '/events' || pathname.startsWith('/events/')) {
    const url = request.nextUrl.clone()
    url.pathname = `/cal${pathname.slice('/events'.length)}`
    return NextResponse.redirect(url, 308)
  }

  const apexMatch = /^(\/org\/[^/]+)\/events(\/.*)?$/.exec(pathname)
  if (apexMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `${apexMatch[1]}/cal${apexMatch[2] ?? ''}`
    return NextResponse.redirect(url, 308)
  }

  return null
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

/** Apex paths like /org/demo/cal — public tenant pages, no auth refresh needed. */
function isApexPublicOrgRoute(pathname: string): boolean {
  return /^\/org\/[^/]+(\/|$)/.test(pathname)
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)
  const pathname = request.nextUrl.pathname

  if (orgSlug) {
    const legacyRedirect = redirectEventsToCal(request)
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

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    response.headers.set('x-org-slug', orgSlug)

    if (isNewVisitor && visitorKey) {
      response.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
    }

    return response
  }

  if (isApexPublicOrgRoute(pathname)) {
    const legacyRedirect = redirectEventsToCal(request)
    if (legacyRedirect) return legacyRedirect

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

  if (pathname === '/login' && sessionResponse.user) {
    const destination = safeNextPath(request.nextUrl.searchParams.get('next'))
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url))
    copyCookies(sessionResponse.response, redirectResponse)
    if (isNewVisitor && visitorKey) {
      redirectResponse.cookies.set(VISITOR_COOKIE, visitorKey, VISITOR_COOKIE_OPTIONS)
    }
    return redirectResponse
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  copyCookies(sessionResponse.response, response)

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
