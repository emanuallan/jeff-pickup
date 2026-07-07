import { createClient } from '@/lib/supabase/server'
import type { GroupRulesAgreementRow, GroupRulesStatus } from './group-rules'

export async function getGroupRulesStatusForJoin(
  orgId: string,
  options: { sessionToken?: string | null; phone?: string | null },
): Promise<GroupRulesStatus> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_group_rules_status', {
    p_org_id: orgId,
    p_session_token: options.sessionToken ?? null,
    p_phone: options.phone ?? null,
  })

  if (error || !data) {
    return { active: false, needs_acceptance: false }
  }

  const status = data as GroupRulesStatus
  return {
    active: status.active === true,
    needs_acceptance: status.needs_acceptance === true,
    rules_version: typeof status.rules_version === 'number' ? status.rules_version : undefined,
    rules_text: typeof status.rules_text === 'string' ? status.rules_text : undefined,
  }
}

export type GroupRulesAgreementSummary = {
  version: number
  agreedCount: number
  totalParticipants: number
  agreements: GroupRulesAgreementRow[]
}

export async function getGroupRulesAgreementSummary(
  orgId: string,
  version: number,
): Promise<GroupRulesAgreementSummary> {
  const supabase = await createClient()

  const [{ count: totalParticipants }, { data: agreements, error }] = await Promise.all([
    supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('participant_group_agreements')
      .select(
        `
        phone,
        accepted_at,
        participant_id,
        participants (
          display_name
        )
      `,
      )
      .eq('org_id', orgId)
      .eq('rules_version', version)
      .order('accepted_at', { ascending: false }),
  ])

  if (error) {
    return {
      version,
      agreedCount: 0,
      totalParticipants: totalParticipants ?? 0,
      agreements: [],
    }
  }

  const rows: GroupRulesAgreementRow[] = (agreements ?? []).map((row) => {
    const participant = row.participants as { display_name?: string } | null
    return {
      participant_id: row.participant_id ? String(row.participant_id) : null,
      phone: String(row.phone),
      display_name: participant?.display_name?.trim() || 'Unknown',
      accepted_at: String(row.accepted_at),
    }
  })

  return {
    version,
    agreedCount: rows.length,
    totalParticipants: totalParticipants ?? 0,
    agreements: rows,
  }
}
