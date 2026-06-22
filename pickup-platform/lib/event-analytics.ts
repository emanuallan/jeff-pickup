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
  /** True when sign-ups exceed cookie-based visitors (e.g. shared phone). */
  conversionCapped: boolean
  capacityFill: number | null
  arrivalStatusCounts: Partial<Record<ArrivalStatus, number>>
  firstSignupAt: string | null
  lastSignupAt: string | null
}

/** Visitors are tracked per browser cookie; sign-ups are per person — cap when they diverge. */
export function computeConversionRate(
  uniqueVisitors: number,
  uniqueSignups: number,
): { rate: number | null; capped: boolean } {
  if (uniqueVisitors <= 0 && uniqueSignups <= 0) {
    return { rate: null, capped: false }
  }

  const denominator = Math.max(uniqueVisitors, uniqueSignups, 1)
  const raw = Math.round((uniqueSignups / denominator) * 100)
  const capped = uniqueVisitors > 0 && uniqueSignups > uniqueVisitors

  return { rate: Math.min(100, raw), capped }
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
  const { rate: conversionRate, capped: conversionCapped } = computeConversionRate(
    db.uniqueVisitors,
    db.uniqueSignups,
  )
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
    conversionCapped,
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

  const [viewsRes, joinedRes, leftRes] = await Promise.all([
    supabase.from('event_page_views').select('viewer_key').eq('event_id', eventId),
    supabase
      .from('event_signup_activity')
      .select('participant_id')
      .eq('event_id', eventId)
      .eq('action', 'joined'),
    supabase
      .from('event_signup_activity')
      .select('participant_id')
      .eq('event_id', eventId)
      .eq('action', 'left'),
  ])

  if (viewsRes.error) {
    console.error('event_page_views read failed:', viewsRes.error.message)
  }
  if (joinedRes.error) {
    console.error('event_signup_activity (joined) read failed:', joinedRes.error.message)
  }
  if (leftRes.error) {
    console.error('event_signup_activity (left) read failed:', leftRes.error.message)
  }

  const views = viewsRes.data ?? []
  const joined = joinedRes.data ?? []
  const left = leftRes.data ?? []

  return buildRosterAnalytics(roster, capacity, {
    pageViews: views.length,
    uniqueVisitors: new Set(views.map((v) => v.viewer_key)).size,
    uniqueSignups: new Set(joined.map((r) => r.participant_id)).size,
    uniqueLeft: new Set(left.map((r) => r.participant_id)).size,
  })
}
