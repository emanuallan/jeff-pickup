import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'

/**
 * Update soft participant name/display/email for the current device session.
 * Does not change phone (identity key for this org).
 */
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const displayName = String(body.displayName ?? '').trim()
  const emailRaw = String(body.email ?? '').trim()
  const email = emailRaw ? normalizeLoginEmail(emailRaw) : ''

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Enter your first and last name.' }, { status: 400 })
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const nameError = validateDemoParticipantNames(slug, {
    firstName,
    lastName,
    displayName: displayName || null,
  })
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'Session expired. Sign in again from a session.' }, { status: 401 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_soft_participant_profile', {
    p_session_token: token,
    p_org_id: org.id,
    p_first_name: firstName,
    p_last_name: lastName,
    p_display_name: displayName || null,
    p_email: email || null,
  })

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not update your profile.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true, participant: data })
}
