import { createClient } from '@/lib/supabase/server'
import type { ArrivalStatus } from '@/lib/arrival-status'
import type { RosterEntry } from '@/lib/signups'
import { rosterHeadcount } from '@/lib/signups'

export type EventAnalytics = {
  pageViews: number
  uniqueVisitors: number
  uniqueSignups: number
  uniqueLeft: number
  currentSignups: number
  headcount: number
  totalGuests: number
  conversionRate: number | null
  capacityFill: number | null
  arrivalStatusCounts: Partial<Record<ArrivalStatus, number>>
  firstSignupAt: string | null
  lastSignupAt: string | null
}

export function buildRosterAnalytics(
  roster: RosterEntry[],
  capacity: number | null,
  db: {
    pageViews: number
    uniqueVisitors: number
    uniqueSignups: number
    uniqueLeft: number
  },
): EventAnalytics {
  const arrivalStatusCounts: Partial<Record<ArrivalStatus, number>> = {}
  let totalGuests = 0
  let firstSignupAt: string | null = null
  let lastSignupAt: string | null = null

  for (const entry of roster) {
    totalGuests += entry.guest_count
    arrivalStatusCounts[entry.arrival_status] =
      (arrivalStatusCounts[entry.arrival_status] ?? 0) + 1

    if (!firstSignupAt || entry.created_at < firstSignupAt) {
      firstSignupAt = entry.created_at
    }
    if (!lastSignupAt || entry.created_at > lastSignupAt) {
      lastSignupAt = entry.created_at
    }
  }

  const headcount = rosterHeadcount(roster)
  const conversionRate =
    db.uniqueVisitors > 0
      ? Math.round((db.uniqueSignups / db.uniqueVisitors) * 100)
      : null
  const capacityFill =
    capacity != null && capacity > 0 ? Math.round((headcount / capacity) * 100) : null

  return {
    pageViews: db.pageViews,
    uniqueVisitors: db.uniqueVisitors,
    uniqueSignups: db.uniqueSignups,
    uniqueLeft: db.uniqueLeft,
    currentSignups: roster.length,
    headcount,
    totalGuests,
    conversionRate,
    capacityFill,
    arrivalStatusCounts,
    firstSignupAt,
    lastSignupAt,
  }
}

export async function getEventAnalytics(
  eventId: string,
  roster: RosterEntry[],
  capacity: number | null,
): Promise<EventAnalytics> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_event_analytics', {
    p_event_id: eventId,
  })

  if (error || !data) {
    return buildRosterAnalytics(roster, capacity, {
      pageViews: 0,
      uniqueVisitors: 0,
      uniqueSignups: 0,
      uniqueLeft: 0,
    })
  }

  const row = data as {
    page_views: number
    unique_visitors: number
    unique_signups: number
    unique_left: number
  }

  return buildRosterAnalytics(roster, capacity, {
    pageViews: row.page_views ?? 0,
    uniqueVisitors: row.unique_visitors ?? 0,
    uniqueSignups: row.unique_signups ?? 0,
    uniqueLeft: row.unique_left ?? 0,
  })
}
