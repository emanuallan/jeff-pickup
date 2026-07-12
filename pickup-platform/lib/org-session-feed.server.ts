import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseOrgSessionFeed, type OrgSessionFeedItem } from '@/lib/org-session-feed'

export const getOrgSessionFeed = cache(
  async (orgId: string, limit = 50): Promise<OrgSessionFeedItem[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_org_session_feed', {
      p_org_id: orgId,
      p_limit: limit,
    })

    if (error || data == null) return []
    return parseOrgSessionFeed(data)
  },
)
