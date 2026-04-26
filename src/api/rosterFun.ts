import { getSupabase } from './supabaseClient'

export type PokeRow = {
  id: string
  from_player_name: string
  kind?: 'meg' | 'wave'
  meg_value?: number | null
  created_at: string
}

export type SendPokeResult = {
  kind: 'meg' | 'wave'
  megValue: number | null
}

export async function updateMySignupEmoji(args: {
  signupId: string
  deleteToken: string
  emoji: string
}): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.rpc('update_my_signup_emoji', {
    p_signup_id: args.signupId,
    p_delete_token: args.deleteToken,
    p_emoji: args.emoji,
  })
  if (error) throw error
}

export async function sendPoke(args: {
  fromSignupId: string
  deleteToken: string
  toSignupId: string
  actionKind: 'wave' | 'poke'
  clientToday: string
}): Promise<SendPokeResult> {
  const sb = getSupabase()
  const pKind = args.actionKind === 'wave' ? 'wave' : 'meg'
  const pToday = args.clientToday.slice(0, 10)
  const { data, error } = await sb.rpc('send_poke', {
    p_from_signup_id: args.fromSignupId,
    p_delete_token: args.deleteToken,
    p_to_signup_id: args.toSignupId,
    p_kind: pKind,
    p_today: pToday,
  })
  if (error) throw error

  let row: Record<string, unknown> | null = null
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    row = data as Record<string, unknown>
  } else if (typeof data === 'string') {
    try {
      row = JSON.parse(data) as Record<string, unknown>
    } catch {
      row = null
    }
  }
  const k = row?.kind
  const kind: 'meg' | 'wave' = k === 'wave' || k === 'meg' ? k : pKind
  const megRaw = row?.meg_value ?? row?.megValue
  const megValue = typeof megRaw === 'number' && Number.isFinite(megRaw) ? megRaw : null
  return { kind, megValue: kind === 'wave' ? null : megValue }
}

export async function fetchMyPokes(args: {
  signupId: string
  deleteToken: string
}): Promise<PokeRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('fetch_my_pokes', {
    p_signup_id: args.signupId,
    p_delete_token: args.deleteToken,
  })
  if (error) throw error
  return (data ?? []) as PokeRow[]
}
