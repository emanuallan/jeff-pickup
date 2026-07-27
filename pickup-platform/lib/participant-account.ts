import { cache } from 'react'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'

export type LinkedParticipantOrg = {
  org_id: string
  org_slug: string
  org_name: string
  participant_id: string
  display_name: string
  phone: string
}

/** Link the current soft-session persona in an org to the signed-in auth user. */
export async function linkParticipantToAuthUser(
  orgId: string,
  sessionToken: string,
): Promise<{ ok: true; participant_id: string } | { error: string }> {
  const user = await getAuthUser()
  if (!user) {
    return { error: 'Sign in to save your account.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('link_participant_to_auth_user', {
    p_org_id: orgId,
    p_session_token: sessionToken,
  })

  if (error) {
    return { error: error.message || 'Could not link your account.' }
  }

  const row = data as { participant_id?: string } | null
  if (!row?.participant_id) {
    return { error: 'Could not link your account.' }
  }

  return { ok: true, participant_id: String(row.participant_id) }
}

/** Best-effort link using the request's hc_session cookie. */
export async function linkCurrentSessionParticipant(
  orgId: string,
): Promise<{ ok: true; participant_id: string } | { error: string }> {
  const token = await getSessionToken()
  if (!token) {
    return { error: 'Join a session first so we know which profile to save.' }
  }
  return linkParticipantToAuthUser(orgId, token)
}

export const getMyParticipantOrgs = cache(async (): Promise<LinkedParticipantOrg[]> => {
  const user = await getAuthUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_participant_orgs')
  if (error || !data) return []

  return (data as LinkedParticipantOrg[]).map((row) => ({
    org_id: String(row.org_id),
    org_slug: String(row.org_slug),
    org_name: String(row.org_name),
    participant_id: String(row.participant_id),
    display_name: String(row.display_name),
    phone: String(row.phone),
  }))
})

export const getLinkedParticipantForOrg = cache(
  async (orgId: string): Promise<{ participant_id: string; phone: string } | null> => {
    const user = await getAuthUser()
    if (!user) return null

    const supabase = await createClient()
    const { data } = await supabase
      .from('participants')
      .select('id, phone')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data) return null
    return { participant_id: String(data.id), phone: String(data.phone) }
  },
)
