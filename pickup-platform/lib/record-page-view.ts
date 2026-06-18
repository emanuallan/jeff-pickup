import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionToken } from '@/lib/participant-session'
import { VISITOR_COOKIE } from '@/lib/visitor-cookie'

export type PageViewContext = {
  viewerKey: string
  participantId: string | null
}

/** Read request-scoped data before `after()` — cookies/headers are not available inside it. */
export async function resolvePageViewContext(orgId: string): Promise<PageViewContext | null> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(VISITOR_COOKIE)?.value
  const headerStore = await headers()
  const viewerKey = fromCookie ?? headerStore.get('x-visitor-key')
  if (!viewerKey) {
    return null
  }

  let participantId: string | null = null
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_participant_for_session', {
      p_session_token: sessionToken,
      p_org_id: orgId,
    })
    const participant = data as { participant_id?: string } | null
    participantId = participant?.participant_id ?? null
  }

  return { viewerKey, participantId }
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
