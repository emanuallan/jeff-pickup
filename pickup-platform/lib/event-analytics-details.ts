import { createClient } from '@/lib/supabase/server'
import { arrivalStatusEmoji, arrivalStatusLabel, type ArrivalStatus } from '@/lib/arrival-status'
import { dayKeyInZone, formatInstantInZone } from '@/lib/events'
import { getRosterWithContact, rosterHeadcount } from '@/lib/signups'
import { computeConversionRate } from '@/lib/event-analytics'
import type {
  AllTimeSignupPerson,
  AnalyticsDetailMetric,
  ArrivalStatusRow,
  CapacityDetail,
  GuestCarrier,
  PageViewsDetail,
  SignupFunnelDetail,
  SignupTimelineEvent,
} from '@/lib/event-analytics-details.types'

export type {
  AllTimeSignupPerson,
  AnalyticsDetailMetric,
  ArrivalStatusRow,
  CapacityDetail,
  GuestCarrier,
  PageViewsDetail,
  SignupFunnelDetail,
  SignupTimelineEvent,
} from '@/lib/event-analytics-details.types'

type EventContext = {
  eventId: string
  timezone: string
  capacity: number | null
  minPlayers: number | null
  isOnline: boolean
}

function parseParticipant(raw: unknown) {
  const p = (Array.isArray(raw) ? raw[0] : raw) as {
    first_name: string
    last_name: string
    phone: string
    display_name: string
  } | null

  return {
    displayName: p?.display_name ?? 'Unknown',
    firstName: p?.first_name ?? '',
    lastName: p?.last_name ?? '',
    phone: p?.phone ?? '',
  }
}

export async function getPageViewsDetail(
  eventId: string,
  timezone: string,
): Promise<PageViewsDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_page_views')
    .select('viewer_key, viewed_at')
    .eq('event_id', eventId)
    .order('viewed_at', { ascending: true })

  if (error || !data) {
    return { days: [], repeatViews: 0, avgViewsPerVisitor: null }
  }

  const byDay = new Map<string, { viewCount: number; sampleAt: string }>()
  const viewers = new Set<string>()

  for (const row of data) {
    viewers.add(row.viewer_key)
    const key = dayKeyInZone(row.viewed_at, timezone)
    const existing = byDay.get(key)
    if (existing) {
      existing.viewCount += 1
    } else {
      byDay.set(key, { viewCount: 1, sampleAt: row.viewed_at })
    }
  }

  const days = [...byDay.entries()].map(([, { viewCount, sampleAt }]) => ({
    label: formatInstantInZone(sampleAt, timezone).replace(/, \d{1,2}:\d{2} [AP]M$/, ''),
    viewCount,
  }))

  const totalViews = data.length
  const uniqueVisitors = viewers.size

  return {
    days,
    repeatViews: Math.max(0, totalViews - uniqueVisitors),
    avgViewsPerVisitor: uniqueVisitors > 0 ? Math.round((totalViews / uniqueVisitors) * 10) / 10 : null,
  }
}

export async function getSignupFunnelDetail(
  eventId: string,
  uniqueVisitors: number,
  uniqueSignups: number,
): Promise<SignupFunnelDetail> {
  const supabase = await createClient()

  const [{ data: views }, { data: joins }] = await Promise.all([
    supabase.from('event_page_views').select('id').eq('event_id', eventId),
    supabase
      .from('event_signup_activity')
      .select('participant_id')
      .eq('event_id', eventId)
      .eq('action', 'joined'),
  ])

  const joinRows = joins ?? []
  const joinCounts = new Map<string, number>()

  for (const row of joinRows) {
    joinCounts.set(row.participant_id, (joinCounts.get(row.participant_id) ?? 0) + 1)
  }

  const rejoinPeople = [...joinCounts.values()].filter((count) => count > 1).length
  const rejoinEvents = Math.max(0, joinRows.length - joinCounts.size)

  const totalViews = views?.length ?? 0
  const { capped } = computeConversionRate(uniqueVisitors, uniqueSignups)

  return {
    rejoinEvents,
    rejoinPeople,
    repeatPageLoads: Math.max(0, totalViews - uniqueVisitors),
    conversionNote: capped
      ? 'More people signed up than unique browsers — likely shared devices.'
      : null,
  }
}

export async function getAllTimeSignupsDetail(eventId: string): Promise<AllTimeSignupPerson[]> {
  const supabase = await createClient()

  const [{ data: joins }, { data: roster }] = await Promise.all([
    supabase
      .from('event_signup_activity')
      .select('participant_id, created_at, participants(first_name, last_name, phone, display_name)')
      .eq('event_id', eventId)
      .eq('action', 'joined')
      .order('created_at', { ascending: true }),
    supabase.from('signups').select('participant_id').eq('event_id', eventId),
  ])

  if (!joins) return []

  const onRoster = new Set((roster ?? []).map((r) => r.participant_id))
  const firstJoin = new Map<string, (typeof joins)[number]>()

  for (const row of joins) {
    if (!firstJoin.has(row.participant_id)) {
      firstJoin.set(row.participant_id, row)
    }
  }

  return [...firstJoin.values()]
    .map((row) => {
      const person = parseParticipant(row.participants)
      return {
        participantId: row.participant_id,
        ...person,
        firstJoinedAt: row.created_at,
        status: onRoster.has(row.participant_id) ? ('on_roster' as const) : ('left' as const),
      }
    })
    .sort((a, b) => b.firstJoinedAt.localeCompare(a.firstJoinedAt))
}

export async function getArrivalStatusDetail(
  eventId: string,
  isOnline: boolean,
): Promise<ArrivalStatusRow[]> {
  const roster = await getRosterWithContact(eventId)

  const counts = new Map<ArrivalStatus, { signupCount: number; headcount: number }>()

  for (const entry of roster) {
    const status = entry.arrival_status as ArrivalStatus
    const existing = counts.get(status) ?? { signupCount: 0, headcount: 0 }
    existing.signupCount += 1
    existing.headcount += 1 + entry.guest_count
    counts.set(status, existing)
  }

  return [...counts.entries()]
    .map(([status, { signupCount, headcount }]) => ({
      status,
      emoji: arrivalStatusEmoji(status, isOnline),
      label: arrivalStatusLabel(status, isOnline),
      signupCount,
      headcount,
    }))
    .sort((a, b) => b.headcount - a.headcount)
}

export async function getGuestCarriersDetail(eventId: string): Promise<GuestCarrier[]> {
  const roster = await getRosterWithContact(eventId)

  return roster
    .filter((entry) => entry.guest_count > 0)
    .map((entry) => ({
      displayName: entry.display_name,
      firstName: entry.first_name,
      lastName: entry.last_name,
      guestCount: entry.guest_count,
    }))
    .sort((a, b) => b.guestCount - a.guestCount)
}

export async function getCapacityDetail(ctx: EventContext): Promise<CapacityDetail> {
  const roster = await getRosterWithContact(ctx.eventId)
  const headcount = rosterHeadcount(roster)
  const capacity = ctx.capacity ?? 0

  const spotsRemaining = capacity - headcount
  const minPlayers = ctx.minPlayers

  return {
    spotsRemaining,
    isFull: capacity > 0 && headcount >= capacity,
    isOverCapacity: capacity > 0 && headcount > capacity,
    minPlayers,
    minMet: minPlayers != null ? headcount >= minPlayers : null,
    needForMin: minPlayers != null ? Math.max(0, minPlayers - headcount) : null,
  }
}

export async function getSignupTimelineDetail(
  eventId: string,
  timezone: string,
): Promise<SignupTimelineEvent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_signup_activity')
    .select('action, created_at, participants(display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    const raw = row.participants
    const p = (Array.isArray(raw) ? raw[0] : raw) as { display_name: string } | null
    return {
      action: row.action as 'joined' | 'left',
      displayName: p?.display_name ?? 'Unknown',
      at: formatInstantInZone(row.created_at, timezone),
    }
  })
}

export async function getAnalyticsDetail(
  metric: AnalyticsDetailMetric,
  ctx: EventContext & {
    uniqueVisitors: number
    uniqueSignups: number
  },
) {
  switch (metric) {
    case 'page-views':
      return getPageViewsDetail(ctx.eventId, ctx.timezone)
    case 'signup-funnel':
      return getSignupFunnelDetail(ctx.eventId, ctx.uniqueVisitors, ctx.uniqueSignups)
    case 'all-time-signups':
      return getAllTimeSignupsDetail(ctx.eventId)
    case 'arrival-status':
      return getArrivalStatusDetail(ctx.eventId, ctx.isOnline)
    case 'guest-carriers':
      return getGuestCarriersDetail(ctx.eventId)
    case 'capacity':
      return getCapacityDetail(ctx)
    case 'signup-timeline':
      return getSignupTimelineDetail(ctx.eventId, ctx.timezone)
  }
}
