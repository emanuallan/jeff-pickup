export type OrganizerNotificationKind =
  | 'new_signup_batch'
  | 'returning_signup_batch'
  | 'unregister_batch'
  | 'unregister_immediate'

export type OrganizerNotificationPayload = {
  count: number
  participant_names: string[]
  event_short_id: string
  event_starts_at: string
  event_label: string
}

export type OrganizerNotification = {
  id: string
  org_id: string
  org_slug: string
  org_name: string
  event_id: string
  kind: OrganizerNotificationKind
  payload: OrganizerNotificationPayload
  created_at: string
  read_at: string | null
}

function namesPreview(names: string[], count: number): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  const remaining = count - 1
  return `${names[0]} and ${remaining} other${remaining === 1 ? '' : 's'}`
}

/** Human-readable copy — badge carries category; title is who did what. */
export function formatOrganizerNotificationCopy(n: OrganizerNotification): {
  title: string
  detail: string
} {
  const { count, participant_names, event_label } = n.payload
  const preview = namesPreview(participant_names, count)

  switch (n.kind) {
    case 'new_signup_batch':
      if (count === 1) {
        return {
          title: preview ? `${preview} signed up` : '1 player signed up',
          detail: event_label,
        }
      }
      return {
        title: preview ? `${preview} signed up` : `${count} players signed up`,
        detail: event_label,
      }
    case 'returning_signup_batch':
      if (count === 1) {
        return {
          title: preview ? `${preview} signed up` : '1 player signed up',
          detail: event_label,
        }
      }
      return {
        title: preview ? `${preview} signed up` : `${count} players signed up`,
        detail: event_label,
      }
    case 'unregister_immediate':
      return {
        title: preview ? `${preview} can't make it` : "1 player can't make it",
        detail: event_label,
      }
    case 'unregister_batch':
      if (count === 1) {
        return {
          title: preview ? `${preview} can't make it` : "1 player can't make it",
          detail: event_label,
        }
      }
      return {
        title: `${count} players can't make it`,
        detail: event_label,
      }
    default:
      return { title: 'Roster update', detail: event_label }
  }
}

export function organizerNotificationHref(n: OrganizerNotification): string {
  return `/console/${n.org_slug}/events/${n.payload.event_short_id}`
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
