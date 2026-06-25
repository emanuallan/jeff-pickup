import { createClient } from '@/lib/supabase/server'
import type {
  OrganizerNotification,
  OrganizerNotificationKind,
  OrganizerNotificationPayload,
} from '@/lib/organizer-notifications'

function parseNotification(row: Record<string, unknown>): OrganizerNotification {
  const payload = row.payload as Partial<OrganizerNotificationPayload>
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    org_slug: String(row.org_slug),
    org_name: String(row.org_name),
    event_id: String(row.event_id),
    kind: row.kind as OrganizerNotificationKind,
    payload: {
      count: Number(payload.count ?? 0),
      participant_names: Array.isArray(payload.participant_names)
        ? payload.participant_names.map(String)
        : [],
      event_short_id: String(payload.event_short_id ?? ''),
      event_starts_at: String(payload.event_starts_at ?? ''),
      event_label: String(payload.event_label ?? 'Session'),
    },
    created_at: String(row.created_at),
    read_at: row.read_at ? String(row.read_at) : null,
  }
}

export async function getOrganizerNotifications(
  orgId?: string | null,
  limit = 30,
): Promise<OrganizerNotification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_organizer_notifications', {
    p_org_id: orgId ?? null,
    p_limit: limit,
  })

  if (error || !data) {
    return []
  }

  return (data as Record<string, unknown>[]).map(parseNotification)
}

export async function countUnreadOrganizerNotifications(orgId?: string | null): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('count_unread_organizer_notifications', {
    p_org_id: orgId ?? null,
  })

  if (error || data == null) {
    return 0
  }

  return Number(data)
}
