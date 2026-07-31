import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type SoftParticipantCareerStats = {
  participant_id: string
  goals: number
  assists: number
  mvp_awards: number
}

/** Career goals/assists + MVP awards for a soft session (security-definer RPC). */
export const getSoftParticipantCareerStats = cache(
  async (
    sessionToken: string | null,
    orgId: string,
  ): Promise<SoftParticipantCareerStats | null> => {
    if (!sessionToken) return null

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_soft_participant_career_stats', {
      p_session_token: sessionToken,
      p_org_id: orgId,
    })

    if (error || !data) return null

    const row = data as SoftParticipantCareerStats
    return {
      participant_id: String(row.participant_id),
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      mvp_awards: Number(row.mvp_awards) || 0,
    }
  },
)
