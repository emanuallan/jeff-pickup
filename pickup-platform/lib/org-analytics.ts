import { createClient } from '@/lib/supabase/server'
import { computeConversionRate } from '@/lib/event-analytics'
import { getOrgCapsLeaderboard } from '@/lib/engagement'

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
}

export async function getOrgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [viewsRes, joinedRes, leftRes, pastEventsRes, upcomingEventsRes, signupsRes, topCaps] =
    await Promise.all([
      supabase.from('event_page_views').select('viewer_key').eq('org_id', orgId),
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

  if (viewsRes.error) {
    console.error('event_page_views (org) read failed:', viewsRes.error.message)
  }
  if (joinedRes.error) {
    console.error('event_signup_activity (org joined) read failed:', joinedRes.error.message)
  }
  if (leftRes.error) {
    console.error('event_signup_activity (org left) read failed:', leftRes.error.message)
  }

  const views = viewsRes.data ?? []
  const joined = joinedRes.data ?? []
  const left = leftRes.data ?? []
  const signups = signupsRes.data ?? []

  const uniqueVisitors = new Set(views.map((v) => v.viewer_key)).size
  const uniqueSignups = new Set(joined.map((r) => r.participant_id)).size
  const uniqueLeft = new Set(left.map((r) => r.participant_id)).size
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
    uniqueLeft,
    conversionRate,
    conversionCapped,
    pastSessions: pastEventIds.size,
    avgAttendance,
    activeSignups,
    topAttendee: top ? { name: top.display_name, caps: top.caps } : null,
  }
}
