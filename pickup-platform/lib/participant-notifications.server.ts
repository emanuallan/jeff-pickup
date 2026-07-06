import { createClient } from '@/lib/supabase/server'
import type {
  ParticipantNotification,
  ParticipantNotificationKind,
  ParticipantNotificationPayload,
} from '@/lib/participant-notifications'

function parseNotification(row: Record<string, unknown>): ParticipantNotification {
  const payload = row.payload as Partial<ParticipantNotificationPayload>
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    event_id: String(row.event_id),
    kind: row.kind as ParticipantNotificationKind,
    payload: {
      event_short_id: String(payload.event_short_id ?? ''),
      event_label: String(payload.event_label ?? 'Session'),
      event_starts_at: String(payload.event_starts_at ?? ''),
      location_label: String(payload.location_label ?? ''),
    },
    created_at: String(row.created_at),
    read_at: row.read_at ? String(row.read_at) : null,
  }
}

export async function getParticipantNotificationInbox(
  sessionToken: string,
  orgId: string,
  limit = 30,
): Promise<{ notifications: ParticipantNotification[]; unreadCount: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_participant_notification_inbox', {
    p_session_token: sessionToken,
    p_org_id: orgId,
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
