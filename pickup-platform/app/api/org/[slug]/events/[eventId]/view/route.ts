import { NextResponse } from 'next/server'
import { getOrgBySlug } from '@/lib/orgs'
import { getEventById } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'
import { getOrCreateVisitorKey } from '@/lib/visitor-cookie'

type Params = { params: Promise<{ slug: string; eventId: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const event = await getEventById(eventId, org.id)
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const viewerKey = await getOrCreateVisitorKey()
  const supabase = await createClient()

  let participantId: string | null = null
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    const { data } = await supabase.rpc('get_participant_for_session', {
      p_session_token: sessionToken,
      p_org_id: org.id,
    })
    const participant = data as { participant_id?: string } | null
    participantId = participant?.participant_id ?? null
  }

  const { error } = await supabase.rpc('record_event_page_view', {
    p_event_id: eventId,
    p_viewer_key: viewerKey,
    p_participant_id: participantId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
