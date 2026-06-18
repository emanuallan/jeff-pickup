import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ArrivalStatus } from '@/lib/arrival-status'

export type RosterEntry = {
  id: string
  event_id: string
  participant_id: string
  display_name: string
  guest_count: number
  arrival_status: ArrivalStatus
  created_at: string
}

export type SignupWithContact = RosterEntry & {
  first_name: string
  last_name: string
  phone: string
}

/** Memoized per-request so headcount + roster panels share one query. */
export const getPublicRoster = cache(async (eventId: string): Promise<RosterEntry[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_roster_public')
    .select('id, event_id, participant_id, display_name, guest_count, arrival_status, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as RosterEntry[]
})

export async function getRosterWithContact(eventId: string): Promise<SignupWithContact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('signups')
    .select('id, event_id, participant_id, guest_count, arrival_status, created_at, participants(first_name, last_name, phone, display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const raw = row.participants
    const p = (Array.isArray(raw) ? raw[0] : raw) as {
      first_name: string
      last_name: string
      phone: string
      display_name: string
    } | null
    return {
      id: row.id,
      event_id: row.event_id,
      participant_id: row.participant_id,
      guest_count: row.guest_count,
      arrival_status: row.arrival_status as ArrivalStatus,
      created_at: row.created_at,
      display_name: p?.display_name ?? 'Unknown',
      first_name: p?.first_name ?? '',
      last_name: p?.last_name ?? '',
      phone: p?.phone ?? '',
    }
  })
}

export function rosterHeadcount(entries: RosterEntry[]): number {
  return entries.reduce((sum, e) => sum + 1 + e.guest_count, 0)
}
