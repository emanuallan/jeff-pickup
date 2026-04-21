import type { LocationId, Signup } from '../features/signups/types'
import { getSupabase } from './supabaseClient'

export async function fetchSignups(args: { playDate: string }): Promise<Signup[]> {
  const sb = getSupabase()

  const { data, error } = await sb
    .from('signups')
    .select('*')
    .eq('play_date', args.playDate)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row: any) => {
    const guestRaw = row?.guest_count
    const guestParsed =
      typeof guestRaw === 'number'
        ? guestRaw
        : typeof guestRaw === 'string'
          ? Number.parseInt(guestRaw, 10)
          : 0
    const guestCount = Number.isFinite(guestParsed) ? Math.max(0, Math.min(20, guestParsed)) : 0
    return { ...row, guest_count: guestCount } as Signup
  })
}

export async function createSignup(args: {
  playDate: string
  location: LocationId
  playerName: string
  guestCount: number
  deleteToken: string
}): Promise<void> {
  const sb = getSupabase()

  const { error } = await sb.from('signups').insert({
    play_date: args.playDate,
    location: args.location,
    player_name: args.playerName,
    guest_count: args.guestCount,
    delete_token: args.deleteToken,
  })

  if (error) throw error
}

export async function unregisterSignup(args: {
  signupId: string
  deleteToken: string
}): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.rpc('unregister_signup', {
    p_signup_id: args.signupId,
    p_delete_token: args.deleteToken,
  })
  if (error) throw error
}

