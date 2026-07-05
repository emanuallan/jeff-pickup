import type { SupabaseClient } from '@supabase/supabase-js'

export async function assertLocationInOrg(
  supabase: SupabaseClient,
  orgId: string,
  locationId: string,
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: 'Location not found.' }
  }

  return { ok: true }
}
