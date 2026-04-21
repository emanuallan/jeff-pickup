import { getSupabase } from './supabaseClient'
import { todayLocalISODate } from '../lib/date'

export type CapsLeaderboardRow = {
  displayName: string
  nameKey: string
  caps: number
}

export type WeeklyStreakRow = {
  nameKey: string
  currentStreakWeeks: number
  bestStreakWeeks: number
}

export async function fetchCapsLeaderboard(args?: { limit?: number; asOf?: string }): Promise<CapsLeaderboardRow[]> {
  const sb = getSupabase()
  if (!sb) return []

  const limit = typeof args?.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 500) : 150
  const asOf = (args?.asOf ?? todayLocalISODate()).slice(0, 10)
  const { data, error } = await sb.rpc('player_caps_leaderboard', { p_as_of: asOf, p_limit: limit })
  if (error) throw error

  const rows: CapsLeaderboardRow[] = []
  for (const row of data ?? []) {
    const r = row as { display_name?: string; name_key?: string; caps?: number | string }
    const displayName = String(r.display_name ?? '').trim()
    const nameKey = String(r.name_key ?? '').trim().toLowerCase()
    const raw = r.caps
    const caps =
      typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseInt(raw, 10) : 0
    if (!displayName || !nameKey) continue
    rows.push({ displayName, nameKey, caps: Number.isFinite(caps) ? caps : 0 })
  }
  return rows
}

export async function fetchPlayerDistinctGameCounts(nameKeys: string[]): Promise<Record<string, number>> {
  const sb = getSupabase()
  const unique = [...new Set(nameKeys.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  if (!sb || unique.length === 0) return {}

  const { data, error } = await sb.rpc('player_distinct_game_counts', { p_names: unique })
  if (error) throw error

  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    const r = row as { name_key?: string; game_count?: number | string }
    const key = String(r.name_key ?? '').trim().toLowerCase()
    const raw = r.game_count
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseInt(raw, 10) : 0
    if (key) out[key] = Number.isFinite(n) ? n : 0
  }
  return out
}

export async function fetchPlayerWeeklyStreaks(args: {
  nameKeys: string[]
  asOf: string
}): Promise<Record<string, WeeklyStreakRow>> {
  const sb = getSupabase()
  const unique = [...new Set(args.nameKeys.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  if (!sb || unique.length === 0) return {}

  const asOf = args.asOf.slice(0, 10)
  const { data, error } = await sb.rpc('player_weekly_streaks', { p_names: unique, p_as_of: asOf })
  if (error) throw error

  const out: Record<string, WeeklyStreakRow> = {}
  for (const row of data ?? []) {
    const r = row as {
      name_key?: string
      current_streak_weeks?: number | string
      best_streak_weeks?: number | string
    }
    const key = String(r.name_key ?? '').trim().toLowerCase()
    if (!key) continue

    const currentRaw = r.current_streak_weeks
    const bestRaw = r.best_streak_weeks
    const current =
      typeof currentRaw === 'number'
        ? currentRaw
        : typeof currentRaw === 'string'
          ? Number.parseInt(currentRaw, 10)
          : 0
    const best =
      typeof bestRaw === 'number' ? bestRaw : typeof bestRaw === 'string' ? Number.parseInt(bestRaw, 10) : 0

    out[key] = {
      nameKey: key,
      currentStreakWeeks: Number.isFinite(current) ? current : 0,
      bestStreakWeeks: Number.isFinite(best) ? best : 0,
    }
  }
  return out
}
