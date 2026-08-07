import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'

/**
 * Update soft participant profile for the current device session.
 * Phone is optional contact (can clear); participants.id is durable identity.
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
  const phoneProvided = Object.prototype.hasOwnProperty.call(body, 'phone')
  const phoneRaw = phoneProvided ? String(body.phone ?? '').trim() : null
  const phone = phoneRaw != null && phoneRaw.length > 0 ? normalizePhoneDigits(phoneRaw) : phoneRaw

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Enter your first and last name.' }, { status: 400 })
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (phone != null && phone.length > 0 && !isValidPhoneDigits(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
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
    ...(phoneProvided ? { p_phone: phone ?? '' } : {}),
  })

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not update your profile.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true, participant: data })
}
