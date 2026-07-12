import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'
import { parseOrgSessionFeed, type OrgSessionFeedItem } from '@/lib/org-session-feed'

export const getOrgSessionFeed = cache(
  async (orgId: string, limit = 50): Promise<OrgSessionFeedItem[]> => {
    const sessionToken = await getSessionToken()
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_org_session_feed', {
      p_org_id: orgId,
      p_limit: limit,
      p_session_token: sessionToken,
    })

    if (error || data == null) return []
    return parseOrgSessionFeed(data)
  },
)

export async function hasParticipantFeedSession(orgId: string): Promise<boolean> {
  const token = await getSessionToken()
  if (!token) return false

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_participant_for_session', {
    p_session_token: token,
    p_org_id: orgId,
  })

  return !error && data != null
}
