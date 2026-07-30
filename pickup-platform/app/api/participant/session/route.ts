import { NextResponse, type NextRequest } from 'next/server'
import { applyParticipantSessionClear, getParticipantCookieOptions } from '@/lib/auth-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'

/**
 * Save a soft participant (name/phone, optional email) and issue a device session.
 * Route handler rather than a server action so the Set-Cookie does not invalidate
 * the router cache and re-render the join UI mid-flow.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const phone = normalizePhoneDigits(String(body.phone ?? ''))
  const email = String(body.email ?? '').trim()

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }

  if (!isValidPhoneDigits(phone) || !firstName || !lastName) {
    return NextResponse.json(
      { error: 'Enter your name and phone to continue.' },
      { status: 400 },
    )
  }

  const nameError = validateDemoParticipantNames(slug, {
    firstName,
    lastName,
    displayName: null,
  })
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ensure_soft_participant', {
    p_org_id: org.id,
    p_phone: phone,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email || null,
  })

  const result = data as { session_token?: string } | null
  if (error || !result?.session_token) {
    return NextResponse.json(
      { error: error?.message || 'Could not save your profile.' },
      { status: 400 },
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, String(result.session_token), getParticipantCookieOptions())
  return response
}

/** Clear the anonymous participant device session (hc_session) on this host. */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (token) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.rpc('clear_participant_device_session', {
        p_session_token: token,
      })
      if (error) {
        console.warn('clear_participant_device_session failed', error.message)
      }
    } catch (error) {
      console.warn(
        'clear_participant_device_session threw',
        error instanceof Error ? error.message : error,
      )
    }
  }

  await applyParticipantSessionClear(response)
  return response
}
