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
      feedback_outcome:
        payload.feedback_outcome === 'rated' || payload.feedback_outcome === 'no_attend'
          ? payload.feedback_outcome
          : undefined,
      rating:
        typeof payload.rating === 'number'
          ? payload.rating
          : payload.rating != null && payload.rating !== ''
            ? Number(payload.rating)
            : undefined,
    },
    created_at: String(row.created_at),
    read_at: row.read_at ? String(row.read_at) : null,
  }
}

export async function getOrganizerNotifications(
  orgId?: string | null,
  limit = 30,
): Promise<OrganizerNotification[]> {
  const inbox = await getOrganizerNotificationInbox(orgId, limit)
  return inbox.notifications
}

export async function getOrganizerNotificationInbox(
  orgId?: string | null,
  limit = 30,
): Promise<{ notifications: OrganizerNotification[]; unreadCount: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_organizer_notification_inbox', {
    p_org_id: orgId ?? null,
    p_limit: limit,
  })

  if (error || !data || typeof data !== 'object') {
    return { notifications: [], unreadCount: 0 }
  }

  const payload = data as {
    unread_count?: unknown
    notifications?: unknown
  }

  const rows = Array.isArray(payload.notifications)
    ? (payload.notifications as Record<string, unknown>[])
    : []

  return {
    notifications: rows.map(parseNotification),
    unreadCount: Number(payload.unread_count ?? 0),
  }
}

export async function countUnreadOrganizerNotifications(orgId?: string | null): Promise<number> {
  const inbox = await getOrganizerNotificationInbox(orgId, 1)
  return inbox.unreadCount
}
