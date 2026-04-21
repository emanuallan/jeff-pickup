import { getSupabase } from './supabaseClient'

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
