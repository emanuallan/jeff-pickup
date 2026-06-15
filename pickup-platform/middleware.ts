import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const orgSlug = parseOrgSlugFromHost(host)

  // Subdomain tenant: rewrite to /org/[slug]/...
  if (orgSlug) {
    const url = request.nextUrl.clone()
    const path = url.pathname === '/' ? '' : url.pathname
    url.pathname = `/org/${orgSlug}${path}`
    const rewriteResponse = NextResponse.rewrite(url)
    rewriteResponse.headers.set('x-org-slug', orgSlug)
    return rewriteResponse
  }

  return updateSession(request)
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
