export type ArrivalStatus =
  | 'confirmed'
  | 'on_my_way'
  | 'running_late'
  | 'in_traffic'
  | 'maybe'
  | 'cant_make_it'

export const ARRIVAL_STATUSES: {
  value: ArrivalStatus
  emoji: string
  label: string
}[] = [
  { value: 'confirmed', emoji: '✅', label: "I'm in" },
  { value: 'on_my_way', emoji: '🚗', label: 'On my way' },
  { value: 'running_late', emoji: '⏰', label: 'Running late' },
  { value: 'in_traffic', emoji: '🚦', label: 'Stuck in traffic' },
  { value: 'maybe', emoji: '❓', label: 'Maybe' },
  { value: 'cant_make_it', emoji: '🙅', label: "Can't make it" },
]

export function arrivalStatusLabel(status: string): string {
  return ARRIVAL_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function arrivalStatusEmoji(status: string): string {
  return ARRIVAL_STATUSES.find((s) => s.value === status)?.emoji ?? ''
}
