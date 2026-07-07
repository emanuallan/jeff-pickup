'use server'

import { createClient } from '@/lib/supabase/server'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'
import { orgFeatures } from '@/lib/org-features'
import { groupRulesActive, orgGroupRules } from '@/lib/group-rules'

export async function acceptGroupRules(
  orgSlug: string,
  rulesVersion: number,
  phone?: string,
): Promise<{ error?: string }> {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Group not found.' }
  }

  if (!orgFeatures(org).group_rules) {
    return { error: 'Group rules are not enabled.' }
  }

  const rules = orgGroupRules(org.settings)
  if (!groupRulesActive(true, rules)) {
    return { error: 'Group rules are not configured.' }
  }

  const supabase = await createClient()
  const sessionToken = await getSessionToken()
  const normalizedPhone = phone ? normalizePhoneDigits(phone) : null

  if (!sessionToken && (!normalizedPhone || !isValidPhoneDigits(normalizedPhone))) {
    return { error: 'Enter a valid phone number before accepting.' }
  }

  const { error } = await supabase.rpc('accept_group_rules', {
    p_org_id: org.id,
    p_rules_version: rulesVersion,
    p_session_token: sessionToken,
    p_phone: normalizedPhone,
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}
