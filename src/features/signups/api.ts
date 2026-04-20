import { assertSupabaseConfigured } from '../../lib/supabase'
import type { LocationId, Signup } from './types'

export async function fetchSignups(args: {
  playDate: string
}): Promise<Signup[]> {
  const sb = assertSupabaseConfigured()

  const { data, error } = await sb
    .from('signups')
    .select('*')
    .eq('play_date', args.playDate)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Signup[]
}

export async function createSignup(args: {
  playDate: string
  location: LocationId
  playerName: string
  deleteToken: string
}): Promise<void> {
  const sb = assertSupabaseConfigured()

  const { error } = await sb.from('signups').insert({
    play_date: args.playDate,
    location: args.location,
    player_name: args.playerName,
    delete_token: args.deleteToken,
  })

  if (error) throw error
}

export async function unregisterSignup(args: {
  signupId: string
  deleteToken: string
}): Promise<void> {
  const sb = assertSupabaseConfigured()
  const { error } = await sb.rpc('unregister_signup', {
    p_signup_id: args.signupId,
    p_delete_token: args.deleteToken,
  })
  if (error) throw error
}

export async function adminRemoveSignup(args: {
  signupId: string
  pin: string
}): Promise<void> {
  const sb = assertSupabaseConfigured()
  const { error } = await sb.rpc('admin_remove_signup', {
    p_signup_id: args.signupId,
    p_pin: args.pin,
  })
  if (error) throw error
}

