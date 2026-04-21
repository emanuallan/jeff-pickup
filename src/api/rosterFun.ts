import { getSupabase } from './supabaseClient'

export type PokeRow = {
  id: string
  from_player_name: string
  created_at: string
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
}): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.rpc('send_poke', {
    p_from_signup_id: args.fromSignupId,
    p_delete_token: args.deleteToken,
    p_to_signup_id: args.toSignupId,
  })
  if (error) throw error
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
