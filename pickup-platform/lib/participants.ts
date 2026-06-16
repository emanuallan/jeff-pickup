import { createClient } from '@/lib/supabase/server'

export type OrgParticipantHistory = {
  id: string
  first_name: string
  last_name: string
  display_name: string
  phone: string
  session_count: number
}

/** All participants for an org with signup counts (organizer console; RLS-gated). */
export async function getParticipantHistoryForOrg(
  orgId: string,
): Promise<OrgParticipantHistory[]> {
  const supabase = await createClient()

  const [{ data: participants, error: pError }, { data: signups, error: sError }] =
    await Promise.all([
      supabase
        .from('participants')
        .select('id, first_name, last_name, display_name, phone')
        .eq('org_id', orgId)
        .order('display_name', { ascending: true }),
      supabase.from('signups').select('participant_id').eq('org_id', orgId),
    ])

  if (pError || !participants) return []

  const sessionCounts = new Map<string, number>()
  if (!sError && signups) {
    for (const row of signups) {
      sessionCounts.set(row.participant_id, (sessionCounts.get(row.participant_id) ?? 0) + 1)
    }
  }

  return participants.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    display_name: p.display_name,
    phone: p.phone,
    session_count: sessionCounts.get(p.id) ?? 0,
  }))
}
