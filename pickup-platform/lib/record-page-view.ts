import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

export async function resolveViewerKey(): Promise<string | null> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(VISITOR_COOKIE)?.value
  if (fromCookie) {
    return fromCookie
  }

  const headerStore = await headers()
  return headerStore.get('x-visitor-key')
}

export async function recordEventPageView(eventId: string, orgId: string): Promise<void> {
  const viewerKey = await resolveViewerKey()
  if (!viewerKey) {
    console.error('recordEventPageView: missing viewer key (cookie and x-visitor-key header)')
    return
  }

  const supabase = await createClient()

  let participantId: string | null = null
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    const { data } = await supabase.rpc('get_participant_for_session', {
      p_session_token: sessionToken,
      p_org_id: orgId,
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
    console.error('record_event_page_view failed:', error.message)
  }
}
