import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'
import {
  generateParticipantOtpCode,
  hashParticipantOtpCode,
  type ParticipantOtpPurpose,
} from '@/lib/participant-email-otp'
import { sendParticipantOtpEmail } from '@/lib/resend'

const PURPOSES = new Set<ParticipantOtpPurpose>(['claim', 'recover', 'bind'])

/**
 * Request a participant email OTP (claim / recover / bind).
 * Uses service-role RPCs; never exposes the plaintext code in the response.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const email = normalizeLoginEmail(String(body.email ?? ''))
  const purposeRaw = String(body.purpose ?? 'claim').trim().toLowerCase()
  const purpose = purposeRaw as ParticipantOtpPurpose
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const displayName = String(body.displayName ?? '').trim()
  const phoneRaw = String(body.phone ?? '').trim()
  const phone = phoneRaw ? normalizePhoneDigits(phoneRaw) : ''
  const bindParticipantId = String(body.bindParticipantId ?? '').trim() || null

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!PURPOSES.has(purpose)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (phone && !isValidPhoneDigits(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
  }

  if (purpose === 'claim' || purpose === 'bind') {
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Enter your first and last name.' },
        { status: 400 },
      )
    }
    const nameError = validateDemoParticipantNames(slug, {
      firstName,
      lastName,
      displayName: displayName || null,
    })
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 })
    }
  }

  if (purpose === 'bind' && !bindParticipantId) {
    return NextResponse.json({ error: 'Legacy account required.' }, { status: 400 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  const code = generateParticipantOtpCode()
  const codeHash = hashParticipantOtpCode(org.id, email, code)
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('request_participant_email_otp', {
    p_org_id: org.id,
    p_email: email,
    p_code_hash: codeHash,
    p_purpose: purpose,
    p_first_name: firstName || null,
    p_last_name: lastName || null,
    p_display_name: displayName || null,
    p_phone: phone || null,
    p_bind_participant_id: bindParticipantId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const row = data as { ok?: boolean; error?: string; cooldown_seconds?: number } | null
  if (!row?.ok) {
    return NextResponse.json(
      {
        error: row?.error || 'Could not send code.',
        cooldownSeconds: row?.cooldown_seconds,
      },
      { status: 429 },
    )
  }

  const sent = await sendParticipantOtpEmail({
    to: email,
    code,
    orgName: org.name,
    purpose,
  })

  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
