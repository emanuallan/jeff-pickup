import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'

/** Lookup a phone-only legacy participant for email bind (no session mint). */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  const phone = normalizePhoneDigits(String(body.phone ?? ''))

  if (!slug) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 400 })
  }
  if (!isValidPhoneDigits(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('find_legacy_participant_by_phone', {
    p_org_id: org.id,
    p_phone: phone,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'No account found for that phone number.' }, { status: 404 })
  }

  const row = data as {
    participant_id?: string
    first_name?: string
    last_name?: string
    display_name?: string
    email_verified_at?: string | null
  }

  if (row.email_verified_at) {
    return NextResponse.json(
      { error: 'That account already uses email sign-in.' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    ok: true,
    participantId: row.participant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
  })
}
