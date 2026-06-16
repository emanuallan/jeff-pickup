import { createAdminClient } from '@/lib/supabase/admin'

const SESSION_COUNT = 5

export async function materializeEvents(args?: { orgId?: string }): Promise<number> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('materialize_events', {
    p_session_count: SESSION_COUNT,
    p_org_id: args?.orgId ?? null,
  })

  if (error) {
    throw error
  }

  return typeof data === 'number' ? data : 0
}
