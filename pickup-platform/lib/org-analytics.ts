import { createClient } from '@/lib/supabase/server'
import { computeConversionRate, countUniquePageViewPeople } from '@/lib/event-analytics'
import { getOrgCapsLeaderboard } from '@/lib/engagement'

export type MetricTrend = {
  current: number
  previous: number
}

/** Nullable averages — periods with no sessions yield null. */
export type NullableMetricTrend = {
  current: number | null
  previous: number | null
}

export type OrgAnalyticsTrends = {
  pageViews: MetricTrend
  joins: MetricTrend
  newParticipants: MetricTrend
  sessions: MetricTrend
  avgAttendance: NullableMetricTrend
}

export type OrgAnalytics = {
  pageViews: number
  uniqueVisitors: number
  uniqueSignups: number
  uniqueLeft: number
  conversionRate: number | null
  conversionCapped: boolean
  pastSessions: number
  avgAttendance: number | null
  activeSignups: number
  topAttendee: { name: string; caps: number } | null
  trends: OrgAnalyticsTrends | null
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'new'

export type TrendDisplay = {
  label: string
  direction: TrendDirection
}

type OrgAnalyticsRpcRow = {
  page_views?: number
  unique_visitors?: number
  unique_signups?: number
  unique_left?: number
  past_sessions?: number
  avg_attendance?: number | null
  active_signups?: number
  trends?: {
    page_views?: { current?: number; previous?: number }
    joins?: { current?: number; previous?: number }
    new_participants?: { current?: number; previous?: number }
    sessions?: { current?: number; previous?: number }
    avg_attendance?: { current?: number | null; previous?: number | null }
  }
}

function parseMetricTrend(raw: { current?: number; previous?: number } | undefined): MetricTrend {
  return {
    current: Number(raw?.current ?? 0),
    previous: Number(raw?.previous ?? 0),
  }
}

function parseNullableMetricTrend(
  raw: { current?: number | null; previous?: number | null } | undefined,
): NullableMetricTrend {
  return {
    current: raw?.current == null ? null : Number(raw.current),
    previous: raw?.previous == null ? null : Number(raw.previous),
  }
}

export function parseOrgAnalyticsTrends(
  raw: OrgAnalyticsRpcRow['trends'] | null | undefined,
): OrgAnalyticsTrends | null {
  if (!raw) return null
  return {
    pageViews: parseMetricTrend(raw.page_views),
    joins: parseMetricTrend(raw.joins),
    newParticipants: parseMetricTrend(raw.new_participants),
    sessions: parseMetricTrend(raw.sessions),
    avgAttendance: parseNullableMetricTrend(raw.avg_attendance),
  }
}

/**
 * Compact week-over-week label for console stat cards.
 * Returns null when both periods are empty (nothing useful to show).
 */
export function formatWeekOverWeekTrend(
  current: number,
  previous: number,
  options?: { asPercent?: boolean; unit?: string },
): TrendDisplay | null {
  if (current === 0 && previous === 0) return null

  if (previous === 0) {
    const unit = options?.unit ? ` ${options.unit}` : ''
    return {
      label: `+${formatTrendNumber(current)}${unit} this week`,
      direction: 'new',
    }
  }

  const delta = current - previous
  if (delta === 0) {
    return { label: 'Same as last week', direction: 'flat' }
  }

  const direction: TrendDirection = delta > 0 ? 'up' : 'down'
  const arrow = direction === 'up' ? '↑' : '↓'

  if (options?.asPercent) {
    const pct = Math.round((Math.abs(delta) / previous) * 100)
    return {
      label: `${arrow}${pct}% vs last week`,
      direction,
    }
  }

  const unit = options?.unit ? ` ${options.unit}` : ''
  return {
    label: `${arrow}${formatTrendNumber(Math.abs(delta))}${unit} vs last week`,
    direction,
  }
}

function formatTrendNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Prefer attendance WoW when both weeks had sessions; otherwise session count. */
export function formatPastSessionsTrend(
  sessions: MetricTrend,
  avgAttendance: NullableMetricTrend,
): TrendDisplay | null {
  if (avgAttendance.current != null && avgAttendance.previous != null) {
    return formatWeekOverWeekTrend(avgAttendance.current, avgAttendance.previous, {
      unit: 'avg',
    })
  }
  return formatWeekOverWeekTrend(sessions.current, sessions.previous)
}

export async function getOrgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const supabase = await createClient()

  const [analyticsRes, topCaps] = await Promise.all([
    supabase.rpc('get_org_analytics', { p_org_id: orgId }),
    getOrgCapsLeaderboard(orgId, 1),
  ])

  if (analyticsRes.error) {
    console.error('get_org_analytics RPC failed:', analyticsRes.error.message)
    return getOrgAnalyticsLegacy(orgId)
  }

  const row = (analyticsRes.data ?? {}) as OrgAnalyticsRpcRow
  const uniqueVisitors = Number(row.unique_visitors ?? 0)
  const uniqueSignups = Number(row.unique_signups ?? 0)
  const { rate: conversionRate, capped: conversionCapped } = computeConversionRate(
    uniqueVisitors,
    uniqueSignups,
  )

  const top = topCaps[0]

  return {
    pageViews: Number(row.page_views ?? 0),
    uniqueVisitors,
    uniqueSignups,
    uniqueLeft: Number(row.unique_left ?? 0),
    conversionRate,
    conversionCapped,
    pastSessions: Number(row.past_sessions ?? 0),
    avgAttendance:
      row.avg_attendance != null ? Number(row.avg_attendance) : null,
    activeSignups: Number(row.active_signups ?? 0),
    topAttendee: top ? { name: top.display_name, caps: top.caps } : null,
    trends: parseOrgAnalyticsTrends(row.trends),
  }
}

/** Pre-RPC fallback when migration 027+ is not applied. */
async function getOrgAnalyticsLegacy(orgId: string): Promise<OrgAnalytics> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [viewsRes, joinedRes, leftRes, pastEventsRes, upcomingEventsRes, signupsRes, topCaps] =
    await Promise.all([
      supabase.from('event_page_views').select('viewer_key, participant_id').eq('org_id', orgId),
      supabase
        .from('event_signup_activity')
        .select('participant_id')
        .eq('org_id', orgId)
        .eq('action', 'joined'),
      supabase
        .from('event_signup_activity')
        .select('participant_id')
        .eq('org_id', orgId)
        .eq('action', 'left'),
      supabase
        .from('events')
        .select('id')
        .eq('org_id', orgId)
        .neq('status', 'cancelled')
        .lt('starts_at', now),
      supabase
        .from('events')
        .select('id')
        .eq('org_id', orgId)
        .neq('status', 'cancelled')
        .gte('starts_at', now),
      supabase.from('signups').select('event_id, guest_count').eq('org_id', orgId),
      getOrgCapsLeaderboard(orgId, 1),
    ])

  const views = viewsRes.data ?? []
  const joined = joinedRes.data ?? []
  const left = leftRes.data ?? []
  const signups = signupsRes.data ?? []

  const uniqueVisitors = countUniquePageViewPeople(views)
  const uniqueSignups = new Set(joined.map((r) => r.participant_id)).size
  const { rate: conversionRate, capped: conversionCapped } = computeConversionRate(
    uniqueVisitors,
    uniqueSignups,
  )

  const pastEventIds = new Set((pastEventsRes.data ?? []).map((e) => e.id))
  const upcomingEventIds = new Set((upcomingEventsRes.data ?? []).map((e) => e.id))

  const headcountsByPastEvent = new Map<string, number>()
  let activeSignups = 0

  for (const row of signups) {
    const headcount = 1 + (row.guest_count ?? 0)
    if (upcomingEventIds.has(row.event_id)) {
      activeSignups += headcount
    }
    if (pastEventIds.has(row.event_id)) {
      headcountsByPastEvent.set(
        row.event_id,
        (headcountsByPastEvent.get(row.event_id) ?? 0) + headcount,
      )
    }
  }

  const pastHeadcounts = [...headcountsByPastEvent.values()]
  const avgAttendance =
    pastHeadcounts.length > 0
      ? Math.round((pastHeadcounts.reduce((sum, n) => sum + n, 0) / pastHeadcounts.length) * 10) /
        10
      : null

  const top = topCaps[0]

  return {
    pageViews: views.length,
    uniqueVisitors,
    uniqueSignups,
    uniqueLeft: new Set(left.map((r) => r.participant_id)).size,
    conversionRate,
    conversionCapped,
    pastSessions: pastEventIds.size,
    avgAttendance,
    activeSignups,
    topAttendee: top ? { name: top.display_name, caps: top.caps } : null,
    trends: null,
  }
}
