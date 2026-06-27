import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrgSessionCounts } from '@/lib/events'

export type OrgConsoleNavCounts = {
  locationCount: number
  scheduleCount: number
  /** Non-cancelled sessions that have not ended yet (live + upcoming). */
  activeSessionCount: number
  /** Non-cancelled sessions whose start time is still in the future. */
  upcomingSessionCount: number
  /** Non-cancelled one-off sessions (schedule_id is null). */
  oneOffEventCount: number
  pastSessionCount: number
  /** Live sessions with status "on". */
  liveSessionCount: number
  participantCount: number
}

/** Lightweight counts for the org console hub nav — avoids loading full event/participant rows. */
export const getOrgConsoleNavCounts = cache(
  async (orgId: string): Promise<OrgConsoleNavCounts> => {
    const supabase = await createClient()

    const [
      locationRes,
      scheduleRes,
      oneOffEventRes,
      sessionCounts,
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
        .is('schedule_id', null)
        .neq('status', 'cancelled'),
      getOrgSessionCounts(orgId),
      supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ])

    return {
      locationCount: locationRes.count ?? 0,
      scheduleCount: scheduleRes.count ?? 0,
      activeSessionCount: sessionCounts.activeCount,
      upcomingSessionCount: sessionCounts.upcomingCount,
      oneOffEventCount: oneOffEventRes.count ?? 0,
      pastSessionCount: sessionCounts.pastCount,
      liveSessionCount: sessionCounts.liveCount,
      participantCount: participantRes.count ?? 0,
    }
  },
)
