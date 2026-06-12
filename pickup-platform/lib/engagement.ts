import { createClient } from '@/lib/supabase/server'
import type { EngagementStats } from '@/lib/badges'

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

export async function getOrgCapsLeaderboard(
  orgId: string,
  limit = 50,
): Promise<CapsLeaderboardRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('org_caps_leaderboard', {
    p_org_id: orgId,
    p_as_of: new Date().toISOString(),
    p_limit: limit,
  })

  if (error || !data) return []

  return (data as CapsLeaderboardRow[]).map((row) => ({
    ...row,
    caps: Number(row.caps),
  }))
}

export async function getOrgStreakLeaderboard(
  orgId: string,
  limit = 20,
): Promise<StreakLeaderboardRow[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase.rpc('org_weekly_streak_leaderboard', {
    p_org_id: orgId,
    p_as_of: today,
    p_limit: limit,
  })

  if (error || !data) return []

  return (data as StreakLeaderboardRow[]).map((row) => ({
    ...row,
    current_streak_weeks: Number(row.current_streak_weeks),
    best_streak_weeks: Number(row.best_streak_weeks),
  }))
}

export async function getParticipantEngagementStats(
  orgId: string,
  participantIds: string[],
): Promise<Map<string, EngagementStats>> {
  if (participantIds.length === 0) return new Map()

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

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
}
