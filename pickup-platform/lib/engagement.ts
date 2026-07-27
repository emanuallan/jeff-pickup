import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { EngagementStats } from '@/lib/badges'
import { getOrgSessionCounts } from '@/lib/events'
import {
  buildLeaderboardMonthKeys,
  buildLeaderboardPeriodChips,
  leaderboardPeriodId,
  monthKeyInZone,
  monthKeyToUtcRange,
  parseLeaderboardPeriodParam,
  type LeaderboardMonthChip,
  type LeaderboardPeriod,
} from '@/lib/leaderboard-period'

export type CapsLeaderboardRow = {
  participant_id: string
  display_name: string
  caps: number
}

export type StreakLeaderboardRow = {
  participant_id: string
  display_name: string
  current_streak_weeks: number
  best_streak_weeks: number
}

export type MvpLeaderboardRow = {
  participant_id: string
  display_name: string
  mvp_count: number
}

export type LeaderboardTimeRange = {
  startIso: string
  endIso: string
} | null

/** Sessions held before the leaderboard is worth showing (avoids empty/sparse boards). */
export const LEADERBOARD_MIN_SESSIONS = 3

/** Minimum consecutive weeks to appear on the public streak leaderboard. */
export const LEADERBOARD_MIN_STREAK_WEEKS = 2

export const getOrgReferenceTimezone = cache(async (orgId: string): Promise<string> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('schedules')
    .select('timezone')
    .eq('org_id', orgId)
    .limit(1)
    .maybeSingle()

  return data?.timezone ?? 'UTC'
})

function localDateInZone(timeZone: string, date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone })
}

/** Count of an org's past, non-cancelled sessions (i.e. sessions that have ended). */
export const getOrgPastSessionCount = cache(async (orgId: string): Promise<number> => {
  const counts = await getOrgSessionCounts(orgId)
  return counts.pastCount
})

/**
 * Whether the org leaderboard should be surfaced yet. Gated on enough past
 * sessions so we never link to an empty or near-empty board.
 */
export const isLeaderboardUnlocked = cache(async (orgId: string): Promise<boolean> => {
  const pastSessions = await getOrgPastSessionCount(orgId)
  return pastSessions >= LEADERBOARD_MIN_SESSIONS
})

/** True when this event is the org's earliest non-cancelled session. */
export const isOrgInauguralSession = cache(async (orgId: string, eventId: string): Promise<boolean> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false
  return data.id === eventId
})

const getOrgEarliestPastSessionStartsAt = cache(async (orgId: string): Promise<string | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('starts_at')
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.starts_at) return null
  return String(data.starts_at)
})

export const getOrgLeaderboardMonthKeys = cache(async (orgId: string): Promise<string[]> => {
  const [timeZone, earliest] = await Promise.all([
    getOrgReferenceTimezone(orgId),
    getOrgEarliestPastSessionStartsAt(orgId),
  ])
  return buildLeaderboardMonthKeys(earliest, timeZone)
})

export const resolveOrgLeaderboardPeriod = cache(
  async (
    orgId: string,
    rawParam: string | null | undefined,
  ): Promise<{
    period: LeaderboardPeriod
    periodId: string
    chips: LeaderboardMonthChip[]
    range: LeaderboardTimeRange
    timeZone: string
  }> => {
    const [timeZone, monthKeys] = await Promise.all([
      getOrgReferenceTimezone(orgId),
      getOrgLeaderboardMonthKeys(orgId),
    ])
    const currentMonthKey = monthKeyInZone(new Date(), timeZone)
    const period = parseLeaderboardPeriodParam(rawParam, monthKeys, currentMonthKey)
    const range =
      period.kind === 'month' ? monthKeyToUtcRange(period.monthKey, timeZone) : null

    return {
      period,
      periodId: leaderboardPeriodId(period),
      chips: buildLeaderboardPeriodChips(monthKeys),
      range,
      timeZone,
    }
  },
)

export const getOrgCapsLeaderboard = cache(
  async (
    orgId: string,
    limit = 50,
    range: LeaderboardTimeRange = null,
  ): Promise<CapsLeaderboardRow[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('org_caps_leaderboard', {
      p_org_id: orgId,
      p_as_of: new Date().toISOString(),
      p_limit: limit,
      p_range_start: range?.startIso ?? null,
      p_range_end: range?.endIso ?? null,
    })

    if (error || !data) return []

    return (data as CapsLeaderboardRow[]).map((row) => ({
      ...row,
      caps: Number(row.caps),
    }))
  },
)

export const getOrgStreakLeaderboard = cache(
  async (orgId: string, limit = 20): Promise<StreakLeaderboardRow[]> => {
    const supabase = await createClient()
    const timeZone = await getOrgReferenceTimezone(orgId)
    const today = localDateInZone(timeZone)

    const { data, error } = await supabase.rpc('org_weekly_streak_leaderboard', {
      p_org_id: orgId,
      p_as_of: today,
      p_limit: limit,
    })

    if (error || !data) return []

    return (data as StreakLeaderboardRow[])
      .map((row) => ({
        ...row,
        current_streak_weeks: Number(row.current_streak_weeks),
        best_streak_weeks: Number(row.best_streak_weeks),
      }))
      .filter((row) => row.current_streak_weeks >= LEADERBOARD_MIN_STREAK_WEEKS)
  },
)

export const getOrgMvpLeaderboard = cache(
  async (
    orgId: string,
    limit = 50,
    range: LeaderboardTimeRange = null,
  ): Promise<MvpLeaderboardRow[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('org_mvp_leaderboard', {
      p_org_id: orgId,
      p_limit: limit,
      p_range_start: range?.startIso ?? null,
      p_range_end: range?.endIso ?? null,
    })

    if (error || !data) return []

    return (data as MvpLeaderboardRow[]).map((row) => ({
      ...row,
      mvp_count: Number(row.mvp_count),
    }))
  },
)

export const getParticipantEngagementStats = cache(
  async (
    orgId: string,
    participantIds: string[],
  ): Promise<Map<string, EngagementStats>> => {
    if (participantIds.length === 0) return new Map()

    const supabase = await createClient()
    const timeZone = await getOrgReferenceTimezone(orgId)
    const today = localDateInZone(timeZone)

    const { data, error } = await supabase.rpc('participant_engagement_stats', {
      p_org_id: orgId,
      p_participant_ids: participantIds,
      p_as_of: today,
    })

    if (error || !data) return new Map()

    const map = new Map<string, EngagementStats>()
    for (const row of data as Array<EngagementStats & { total_sessions?: number }>) {
      map.set(row.participant_id, {
        participant_id: row.participant_id,
        caps: Number(row.caps),
        total_sessions: Number(row.total_sessions ?? 0),
        current_streak_weeks: Number(row.current_streak_weeks),
        best_streak_weeks: Number(row.best_streak_weeks),
      })
    }
    return map
  },
)
