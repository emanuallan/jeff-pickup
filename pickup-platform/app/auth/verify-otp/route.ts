import { NextResponse, type NextRequest } from 'next/server'
import { clearParticipantSessionForSignIn } from '@/lib/auth-cookies'
import { isCompleteOtp, normalizeLoginEmail, normalizeOtpInput } from '@/lib/login-otp'
import { mapOtpAuthError } from '@/lib/login-errors'
import { safeNextPath } from '@/lib/safe-next'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { SESSION_COOKIE } from '@/lib/participant-session'

type Body = {
  email?: string
  token?: string
  next?: string
  /** When set, link the request's hc_session persona in this org after OTP. */
  linkOrgId?: string
  /** Keep hc_session after participant account save (default clears it). */
  keepParticipantSession?: boolean
}

export async function POST(request: NextRequest) {
  let body: Body

  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 })
  }

  const email = normalizeLoginEmail(body.email ?? '')
  const token = normalizeOtpInput(body.token ?? '')
  const nextPath = safeNextPath(body.next)
  const linkOrgId = typeof body.linkOrgId === 'string' ? body.linkOrgId.trim() : ''
  const keepParticipantSession = body.keepParticipantSession === true
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value ?? ''

  if (!email || !isCompleteOtp(token)) {
    return NextResponse.json({ message: 'Enter the full 6-digit code.' }, { status: 400 })
  }

  const responsePayload: Record<string, unknown> = { ok: true, next: nextPath }
  const response = NextResponse.json(responsePayload)
  const supabase = await createRouteHandlerClient(response)
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    return NextResponse.json(
      { message: mapOtpAuthError(error.message) },
      { status: 400 },
    )
  }

  if (linkOrgId && sessionToken) {
    const { error: linkError } = await supabase.rpc('link_participant_to_auth_user', {
      p_org_id: linkOrgId,
      p_session_token: sessionToken,
    })
    if (linkError) {
      console.warn('link_participant_to_auth_user failed after OTP', linkError.message)
      responsePayload.linkError = linkError.message || 'Could not link your group profile.'
    }
  }

  // Rebuild JSON body so linkError is included while keeping auth cookies on `response`.
  const finalResponse = NextResponse.json(responsePayload)
  for (const cookie of response.cookies.getAll()) {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie)
  }

  if (!keepParticipantSession) {
    await clearParticipantSessionForSignIn(finalResponse)
  }
  return finalResponse
}
