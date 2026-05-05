import { getSupabase } from './supabaseClient'

export type AuraLedgerRow = {
  id: number
  created_at: string
  name_key: string
  delta: number
  reason: string
  from_name_key: string | null
  to_name_key: string | null
  roll: number | null
}

export async function fetchAuraLedgerForDay(args: {
  playDate: string
  signupId: string
  deleteToken: string
}): Promise<AuraLedgerRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('fetch_aura_ledger_for_day', {
    p_play_date: args.playDate.slice(0, 10),
    p_signup_id: args.signupId,
    p_delete_token: args.deleteToken,
  })
  if (error) throw error
  return (data ?? []) as AuraLedgerRow[]
}

