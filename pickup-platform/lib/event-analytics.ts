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

type EventAnalyticsDb = {
  pageViews: number
  uniqueVisitors: number
  uniqueSignups: number
  uniqueLeft: number
}

const EMPTY_EVENT_ANALYTICS_DB: EventAnalyticsDb = {
  pageViews: 0,
  uniqueVisitors: 0,
  uniqueSignups: 0,
  uniqueLeft: 0,
}

/** DB-side aggregates via existing RPC — avoids loading every page view / activity row. */
export async function fetchEventAnalyticsDb(eventId: string): Promise<EventAnalyticsDb> {
  const supabase = await createClient()

  const [{ data, error }, uniqueLeft] = await Promise.all([
    supabase.rpc('get_event_analytics', { p_event_id: eventId }),
    fetchNetUnregisteredCount(eventId),
  ])

  if (error) {
    console.error('get_event_analytics RPC failed:', error.message)
    return { ...EMPTY_EVENT_ANALYTICS_DB, uniqueLeft }
  }

  const row = data as {
    page_views?: number
    unique_visitors?: number
    unique_signups?: number
    unique_left?: number
  } | null

  return {
    pageViews: Number(row?.page_views ?? 0),
    uniqueVisitors: Number(row?.unique_visitors ?? 0),
    uniqueSignups: Number(row?.unique_signups ?? 0),
    uniqueLeft,
  }
}

export async function getEventAnalytics(
  eventId: string,
  roster: RosterEntry[],
  capacity: number | null,
): Promise<EventAnalytics> {
  const db = await fetchEventAnalyticsDb(eventId)
  return buildRosterAnalytics(roster, capacity, db)
}

export type EventUnregisteredPerson = {
  participantId: string
  displayName: string
  firstName: string
  lastName: string
  phone: string
  leftAt: string
}

type SignupActivityRow = {
  participant_id: string
  action: string
  created_at: string
}

/** Latest activity per participant must be "left" (excludes re-registrations). */
function netUnregisteredActivityRows<T extends SignupActivityRow>(rows: T[]): T[] {
  const latestByParticipant = new Map<string, T>()
  for (const row of rows) {
    if (!latestByParticipant.has(row.participant_id)) {
      latestByParticipant.set(row.participant_id, row)
    }
  }
  return [...latestByParticipant.values()].filter((row) => row.action === 'left')
}

async function fetchNetUnregisteredCount(eventId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_signup_activity')
    .select('participant_id, action, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('fetchNetUnregisteredCount failed:', error?.message)
    return 0
  }

  return netUnregisteredActivityRows(data).length
}

/** Distinct participants who left and did not re-register — most recent leave first. */
export async function getEventUnregisteredPeople(
  eventId: string,
): Promise<EventUnregisteredPerson[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_signup_activity')
    .select(
      'participant_id, action, created_at, participants(first_name, last_name, phone, display_name)',
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('getEventUnregisteredPeople failed:', error?.message)
    return []
  }

  const people: EventUnregisteredPerson[] = netUnregisteredActivityRows(data).map((row) => {
    const raw = row.participants
    const p = (Array.isArray(raw) ? raw[0] : raw) as {
      first_name: string
      last_name: string
      phone: string
      display_name: string
    } | null

    return {
      participantId: row.participant_id,
      displayName: p?.display_name ?? 'Unknown',
      firstName: p?.first_name ?? '',
      lastName: p?.last_name ?? '',
      phone: p?.phone ?? '',
      leftAt: row.created_at,
    }
  })

  people.sort((a, b) => b.leftAt.localeCompare(a.leftAt))
  return people
}

export type EventKnownVisitor = {
  participantId: string
  displayName: string
  firstName: string
  lastName: string
  phone: string
  viewCount: number
}

export type EventGuestVisitors = {
  visitorCount: number
  viewCount: number
}

export type EventUniqueVisitorsBreakdown = {
  known: EventKnownVisitor[]
  guests: EventGuestVisitors
}

/** Per-person view counts for known participants; anonymous visitors rolled into guests. */
export async function getEventUniqueVisitorsBreakdown(
  eventId: string,
): Promise<EventUniqueVisitorsBreakdown> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_page_views')
    .select(
      'viewer_key, participant_id, participants(first_name, last_name, phone, display_name)',
    )
    .eq('event_id', eventId)

  if (error || !data) {
    console.error('getEventUniqueVisitorsBreakdown failed:', error?.message)
    return { known: [], guests: { visitorCount: 0, viewCount: 0 } }
  }

  const byViewer = new Map<
    string,
    { viewCount: number; participantId: string | null; participant: (typeof data)[number]['participants'] }
  >()

  for (const row of data) {
    const existing = byViewer.get(row.viewer_key)
    if (existing) {
      existing.viewCount += 1
      if (row.participant_id && !existing.participantId) {
        existing.participantId = row.participant_id
        existing.participant = row.participants
      }
    } else {
      byViewer.set(row.viewer_key, {
        viewCount: 1,
        participantId: row.participant_id,
        participant: row.participants,
      })
    }
  }

  const byParticipant = new Map<string, EventKnownVisitor>()
  let guestVisitorCount = 0
  let guestViewCount = 0

  for (const { viewCount, participantId, participant } of byViewer.values()) {
    if (participantId) {
      const existing = byParticipant.get(participantId)
      if (existing) {
        existing.viewCount += viewCount
        continue
      }

      const raw = participant
      const p = (Array.isArray(raw) ? raw[0] : raw) as {
        first_name: string
        last_name: string
        phone: string
        display_name: string
      } | null

      byParticipant.set(participantId, {
        participantId,
        displayName: p?.display_name ?? 'Unknown',
        firstName: p?.first_name ?? '',
        lastName: p?.last_name ?? '',
        phone: p?.phone ?? '',
        viewCount,
      })
    } else {
      guestVisitorCount += 1
      guestViewCount += viewCount
    }
  }

  const known = [...byParticipant.values()].sort((a, b) => b.viewCount - a.viewCount)

  return {
    known,
    guests: { visitorCount: guestVisitorCount, viewCount: guestViewCount },
  }
}
