import { cache } from 'react'
import type { ArrivalStatus } from '@/lib/arrival-status'
import { createClient } from '@/lib/supabase/server'

export type Participant = {
  first_name: string
  last_name: string
  display_name: string
  phone: string
}

export type MySignup = {
  signup_id: string
  guest_count: number
  arrival_status: ArrivalStatus
  display_name: string
}

export type SessionInfo = { participant: Participant | null; mySignup: MySignup | null }

/** Returning-participant lookup. Both RPCs share one client and run in parallel. */
export const getSessionInfo = cache(async (
  token: string | null,
  orgId: string,
  eventId: string,
): Promise<SessionInfo> => {
  if (!token) return { participant: null, mySignup: null }

  const supabase = await createClient()
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.rpc('get_participant_for_session', { p_session_token: token, p_org_id: orgId }),
    supabase.rpc('get_signup_for_session', { p_event_id: eventId, p_session_token: token }),
  ])

  return {
    participant: (p as Participant | null) ?? null,
    mySignup: (s as MySignup | null) ?? null,
  }
})
