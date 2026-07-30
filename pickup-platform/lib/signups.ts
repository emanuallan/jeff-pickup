import { cache } from 'react'
import { getPublicRosterLive, getPublicWaitlistLive } from '@/lib/public-data'
import { createClient } from '@/lib/supabase/server'
import type { ArrivalStatus } from '@/lib/arrival-status'

export type SignupListStatus = 'confirmed' | 'waitlisted'

export type RosterEntry = {
  id: string
  event_id: string
  participant_id: string
  display_name: string
  guest_count: number
  arrival_status: ArrivalStatus
  created_at: string
  list_status?: SignupListStatus
}

export type SignupWithContact = RosterEntry & {
  first_name: string
  last_name: string
  phone: string
  list_status: SignupListStatus
}

/** Memoized per-request so headcount + roster panels share one query. */
export const getPublicRoster = cache(async (eventId: string): Promise<RosterEntry[]> => {
  return getPublicRosterLive(eventId)
})

/** Memoized per-request waitlist for event participation panels. */
export const getPublicWaitlist = cache(async (eventId: string): Promise<RosterEntry[]> => {
  return getPublicWaitlistLive(eventId)
})

export async function getRosterWithContact(eventId: string): Promise<SignupWithContact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('signups')
    .select('id, event_id, participant_id, guest_count, arrival_status, list_status, created_at, participants(first_name, last_name, phone, display_name)')
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
      list_status: (row.list_status as SignupListStatus) ?? 'confirmed',
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

export function splitRosterByStatus<T extends { list_status?: SignupListStatus }>(
  entries: T[],
): { confirmed: T[]; waitlisted: T[] } {
  const confirmed: T[] = []
  const waitlisted: T[] = []

  for (const entry of entries) {
    if (entry.list_status === 'waitlisted') {
      waitlisted.push(entry)
    } else {
      confirmed.push(entry)
    }
  }

  return { confirmed, waitlisted }
}
