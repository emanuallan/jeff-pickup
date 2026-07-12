export type ParticipantNotificationKind = 'session_feedback'

export type ParticipantNotificationPayload = {
  event_short_id: string
  event_label: string
  event_starts_at: string
  location_label: string
}

export type ParticipantNotification = {
  id: string
  org_id: string
  event_id: string
  kind: ParticipantNotificationKind
  payload: ParticipantNotificationPayload
  created_at: string
  read_at: string | null
}

export function formatParticipantNotificationCopy(n: ParticipantNotification): {
  title: string
  detail: string
} {
  const { event_label, location_label } = n.payload
  return {
    title: `Wrap up ${event_label}`,
    detail: location_label,
  }
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
