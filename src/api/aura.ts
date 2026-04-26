import { getSupabase } from './supabaseClient'

export type PlayerAuraRow = { nameKey: string; aura: number }

export async function fetchPlayerAura(nameKeys: string[]): Promise<Record<string, number>> {
  const sb = getSupabase()
  const unique = [...new Set(nameKeys.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  if (!sb || unique.length === 0) return {}

  const { data, error } = await sb.rpc('get_player_aura', { p_names: unique })
  if (error) throw error

  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    const r = row as { name_key?: string; aura?: number | string }
    const k = String(r.name_key ?? '').trim().toLowerCase()
    const raw = r.aura
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseInt(raw, 10) : 1000
    if (k) out[k] = Number.isFinite(n) ? n : 1000
  }
  return out
}
