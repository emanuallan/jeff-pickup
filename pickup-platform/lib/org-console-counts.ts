import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrgPastSessionCount } from '@/lib/engagement'

export type OrgConsoleNavCounts = {
  locationCount: number
  scheduleCount: number
  upcomingCount: number
  upcomingActiveCount: number
  pastSessionCount: number
  participantCount: number
}

/** Lightweight counts for the org console hub nav — avoids loading full event/participant rows. */
export const getOrgConsoleNavCounts = cache(
  async (orgId: string): Promise<OrgConsoleNavCounts> => {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const [
      locationRes,
      scheduleRes,
      upcomingRes,
      upcomingActiveRes,
      pastSessionCount,
      participantRes,
    ] = await Promise.all([
      supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
      supabase
        .from('schedules')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', now),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', now)
        .neq('status', 'cancelled'),
      getOrgPastSessionCount(orgId),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ])

    return {
      locationCount: locationRes.count ?? 0,
      scheduleCount: scheduleRes.count ?? 0,
      upcomingCount: upcomingRes.count ?? 0,
      upcomingActiveCount: upcomingActiveRes.count ?? 0,
      pastSessionCount,
      participantCount: participantRes.count ?? 0,
    }
  },
)
