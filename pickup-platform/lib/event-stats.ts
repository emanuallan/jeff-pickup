import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatEventTime } from '@/lib/events'
import { getOrgCapsLeaderboard, getParticipantEngagementStats } from '@/lib/engagement'

export type GroupPeakHeadcount = {
  peak: number
  when: string | null
  scopeLabel: string
}

export type EventSecretStats = {
  peak: GroupPeakHeadcount
  regulars: { display_name: string; caps: number }[]
  yours: { caps: number; streakWeeks: number } | null
}

/** Best turnout for a recurring series (or whole group for one-offs). */
export const getGroupPeakHeadcount = cache(
  async (orgId: string, scheduleId: string | null): Promise<GroupPeakHeadcount> => {
    const supabase = await createClient()

    let eventsQuery = supabase
      .from('events')
      .select('id, starts_at, timezone')
      .eq('org_id', orgId)
      .neq('status', 'cancelled')

    if (scheduleId) {
      eventsQuery = eventsQuery.eq('schedule_id', scheduleId)
    }

    const { data: events, error } = await eventsQuery
    if (error || !events?.length) {
      return {
        peak: 0,
        when: null,
        scopeLabel: scheduleId ? 'this series' : 'all sessions',
      }
    }

    const eventIds = events.map((e) => e.id)
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('event_id, guest_count')
      .in('event_id', eventIds)

    if (signupsError || !signups?.length) {
      return {
        peak: 0,
        when: null,
        scopeLabel: scheduleId ? 'this series' : 'all sessions',
      }
    }

    const counts = new Map<string, number>()
    for (const row of signups) {
      const add = 1 + Number(row.guest_count ?? 0)
      counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + add)
    }

    let peak = 0
    let peakEventId: string | null = null
    for (const [eventId, count] of counts) {
      if (count > peak) {
        peak = count
        peakEventId = eventId
      }
    }

    const peakEvent = events.find((e) => e.id === peakEventId)
    const when =
      peakEvent != null
        ? formatEventTime({
            starts_at: peakEvent.starts_at,
            timezone: peakEvent.timezone,
          })
        : null

    return {
      peak,
      when,
      scopeLabel: scheduleId ? 'this series' : 'all sessions',
    }
  },
)

export async function getEventSecretStats(
  orgId: string,
  scheduleId: string | null,
  participantId: string | null,
): Promise<EventSecretStats> {
  const [peak, regulars, personal] = await Promise.all([
    getGroupPeakHeadcount(orgId, scheduleId),
    getOrgCapsLeaderboard(orgId, 3),
    participantId
      ? getParticipantEngagementStats(orgId, [participantId]).then(
          (map) => map.get(participantId) ?? null,
        )
      : Promise.resolve(null),
  ])

  return {
    peak,
    regulars: regulars.map((r) => ({ display_name: r.display_name, caps: r.caps })),
    yours: personal
      ? {
          caps: personal.caps,
          streakWeeks: personal.current_streak_weeks,
        }
      : null,
  }
}
