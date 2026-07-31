import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  isSponsorLinkPlacement,
  recordSponsorLinkClick,
} from '@/lib/sponsor-link-clicks'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { safeExternalHref } from '@/lib/social-links'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

const VISITOR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
}

/**
 * Records a public sponsor logo click, then redirects to the sponsor website.
 * Used as the href for footer/ticker logos so tracking works without JS.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const sponsorshipId = String(url.searchParams.get('id') ?? '').trim()
  const placementRaw = String(url.searchParams.get('placement') ?? '').trim()

  if (!sponsorshipId || !isSponsorLinkPlacement(placementRaw)) {
    return NextResponse.redirect(new URL('/', request.url), 302)
  }

  const cookieStore = await cookies()
  const existingVisitor = cookieStore.get(VISITOR_COOKIE)?.value?.trim() || null
  const viewerKey = existingVisitor || crypto.randomUUID()
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value?.trim() || null

  const destination = await recordSponsorLinkClick({
    sponsorshipId,
    placement: placementRaw,
    viewerKey,
    sessionToken,
  })

  const href = destination ? safeExternalHref(destination) : null
  const response = NextResponse.redirect(href ?? new URL('/', request.url), 302)

  if (!existingVisitor) {
    response.cookies.set(VISITOR_COOKIE, viewerKey, VISITOR_COOKIE_OPTIONS)
  }

  return response
}
