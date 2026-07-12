import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type {
  SessionMvpAwardRow,
  SessionMvpBadgeInfo,
  SessionPlayerStatsRow,
} from '@/lib/session-debrief'

type MvpAwardQueryRow = {
  participant_id: string
  vote_count: number
  participants: { display_name: string } | { display_name: string }[] | null
}

type PlayerStatsQueryRow = {
  participant_id: string
  goals: number
  assists: number
  participants: { display_name: string } | { display_name: string }[] | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const getActiveSessionMvpBadges = cache(async (orgId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_active_session_mvp_badges', {
    p_org_id: orgId,
  })

  if (error || !data || typeof data !== 'object') {
    return new Map<string, SessionMvpBadgeInfo>()
  }

  const map = new Map<string, SessionMvpBadgeInfo>()
  for (const [participantId, raw] of Object.entries(data as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue
    const value = raw as Record<string, unknown>
    if (typeof value.event_label !== 'string' || typeof value.event_id !== 'string') continue
    map.set(participantId, {
      event_label: value.event_label,
      event_id: value.event_id,
    })
  }

  return map
})

export const getEventSessionMvpAwards = cache(
  async (orgId: string, eventId: string): Promise<SessionMvpAwardRow[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('session_mvp_awards')
      .select('participant_id, vote_count, participants(display_name)')
      .eq('org_id', orgId)
      .eq('event_id', eventId)
      .order('vote_count', { ascending: false })

    if (error || !data) return []

    return (data as unknown as MvpAwardQueryRow[]).map((row) => ({
      participant_id: row.participant_id,
      participant_display_name: first(row.participants)?.display_name ?? 'Player',
      vote_count: row.vote_count,
    }))
  },
)

export const getEventSessionPlayerStats = cache(
  async (orgId: string, eventId: string): Promise<SessionPlayerStatsRow[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('session_player_stats')
      .select('participant_id, goals, assists, participants(display_name)')
      .eq('org_id', orgId)
      .eq('event_id', eventId)
      .order('goals', { ascending: false })
      .order('assists', { ascending: false })

    if (error || !data) return []

    return (data as unknown as PlayerStatsQueryRow[]).map((row) => ({
      participant_id: row.participant_id,
      participant_display_name: first(row.participants)?.display_name ?? 'Player',
      goals: row.goals,
      assists: row.assists,
    }))
  },
)

export const isEventMvpFinalized = cache(async (eventId: string): Promise<boolean> => {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('session_mvp_finalizations')
    .select('event_id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (error) return false
  return (count ?? 0) > 0
})
