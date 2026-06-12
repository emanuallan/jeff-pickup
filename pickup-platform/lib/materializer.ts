import { createAdminClient } from '@/lib/supabase/admin'

const WINDOW_DAYS = 30

export async function materializeEvents(args?: { orgId?: string }): Promise<number> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('materialize_events', {
    p_window_days: WINDOW_DAYS,
    p_org_id: args?.orgId ?? null,
  })

  if (error) {
    throw error
  }

  return typeof data === 'number' ? data : 0
}
