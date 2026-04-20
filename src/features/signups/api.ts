import { assertSupabaseConfigured } from '../../lib/supabase'
import type { LocationId, Signup } from './types'

export async function fetchSignups(args: {
  playDate: string
  location: LocationId
}): Promise<Signup[]> {
  const sb = assertSupabaseConfigured()

  const { data, error } = await sb
    .from('signups')
    .select('*')
    .eq('play_date', args.playDate)
    .eq('location', args.location)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Signup[]
}

export async function createSignup(args: {
  playDate: string
  location: LocationId
  playerName: string
}): Promise<void> {
  const sb = assertSupabaseConfigured()

  const { error } = await sb.from('signups').insert({
    play_date: args.playDate,
    location: args.location,
    player_name: args.playerName,
  })

  if (error) throw error
}

