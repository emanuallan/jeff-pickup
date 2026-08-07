import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicOrgBySlug } from '@/lib/public-data'
import {
  isCompleteOtp,
  isValidEmail,
  normalizeLoginEmail,
  normalizeOtpInput,
} from '@/lib/login-otp'
import { hashParticipantOtpCode } from '@/lib/participant-email-otp'
import { getParticipantCookieOptions } from '@/lib/auth-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'

/** Verify participant email OTP and set hc_session. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const email = normalizeLoginEmail(String(body.email ?? ''))
  const code = normalizeOtpInput(String(body.code ?? ''))

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!isCompleteOtp(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  const codeHash = hashParticipantOtpCode(org.id, email, code)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('verify_participant_email_otp', {
    p_org_id: org.id,
    p_email: email,
    p_code_hash: codeHash,
  })

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not verify that code.' },
      { status: 400 },
    )
  }

  const row = data as {
    session_token?: string
    participant_id?: string
    display_name?: string
    email?: string
    created?: boolean
  }

  if (!row.session_token) {
    return NextResponse.json({ error: 'Could not verify that code.' }, { status: 400 })
  }

  const response = NextResponse.json({
    ok: true,
    participantId: row.participant_id,
    displayName: row.display_name,
    email: row.email,
    created: row.created === true,
  })
  response.cookies.set(SESSION_COOKIE, String(row.session_token), getParticipantCookieOptions())
  return response
}
