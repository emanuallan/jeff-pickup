export type ArrivalStatus =
  | 'confirmed'
  | 'on_my_way'
  | 'running_late'
  | 'in_traffic'
  | 'maybe'
  | 'cant_make_it'

type ArrivalStatusOption = {
  value: ArrivalStatus
  emoji: string
  label: string
}

// In-person sessions: the status set is about physically getting there.
export const ARRIVAL_STATUSES: ArrivalStatusOption[] = [
  { value: 'confirmed', emoji: '✅', label: "I'm in" },
  { value: 'on_my_way', emoji: '🚗', label: 'On my way' },
  { value: 'running_late', emoji: '⏰', label: 'Running late' },
  { value: 'in_traffic', emoji: '🚦', label: 'Stuck in traffic' },
  { value: 'maybe', emoji: '❓', label: 'Maybe' },
  { value: 'cant_make_it', emoji: '🙅', label: "Can't make it" },
]

// Online sessions: same underlying values, adapted copy/emoji for joining a call.
export const ARRIVAL_STATUSES_ONLINE: ArrivalStatusOption[] = [
  { value: 'confirmed', emoji: '✅', label: "I'm in" },
  { value: 'on_my_way', emoji: '💻', label: 'Logging on' },
  { value: 'running_late', emoji: '⏰', label: 'Running late' },
  { value: 'in_traffic', emoji: '📶', label: 'Connection issues' },
  { value: 'maybe', emoji: '❓', label: 'Maybe' },
  { value: 'cant_make_it', emoji: '🙅', label: "Can't make it" },
]

export function arrivalStatuses(isOnline = false): ArrivalStatusOption[] {
  return isOnline ? ARRIVAL_STATUSES_ONLINE : ARRIVAL_STATUSES
}

export function arrivalStatusLabel(status: string, isOnline = false): string {
  return arrivalStatuses(isOnline).find((s) => s.value === status)?.label ?? status
}

export function arrivalStatusEmoji(status: string, isOnline = false): string {
  return arrivalStatuses(isOnline).find((s) => s.value === status)?.emoji ?? ''
}
