import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

export type PageViewContext = {
  viewerKey: string
  participantId: string | null
}

/** Fast cookie/header read — safe to parallelize with page data fetches. */
export async function resolvePageViewTrackingKeys(): Promise<{
  viewerKey: string | null
  sessionToken: string | null
}> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  return {
    viewerKey:
      cookieStore.get(VISITOR_COOKIE)?.value ?? headerStore.get('x-visitor-key'),
    sessionToken: cookieStore.get(SESSION_COOKIE)?.value ?? null,
  }
}

/** Participant lookup is deferred to `after()` so it does not block FCP. */
export async function lookupParticipantId(
  orgId: string,
  sessionToken: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_participant_for_session', {
    p_session_token: sessionToken,
    p_org_id: orgId,
  })
  const participant = data as { participant_id?: string } | null
  return participant?.participant_id ?? null
}

/** Fire-and-forget page view write — safe to call inside `after()`. */
export async function recordEventPageView(
  eventId: string,
  context: PageViewContext,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('record_event_page_view', {
    p_event_id: eventId,
    p_viewer_key: context.viewerKey,
    p_participant_id: context.participantId,
  })

  if (error) {
    console.error('record_event_page_view failed:', error.message)
  }
}
