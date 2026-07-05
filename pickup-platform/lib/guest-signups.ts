/** Matches Postgres signups.guest_count check (0–20). */
export const MAX_GUEST_COUNT = 20

export function clampGuestCount(count: number): number {
  if (!Number.isFinite(count)) return 0
  return Math.max(0, Math.min(MAX_GUEST_COUNT, Math.floor(count)))
}

export function resolveGuestCount(count: number, guestsEnabled: boolean): number {
  return guestsEnabled ? clampGuestCount(count) : 0
}

export function guestCountOptions(): number[] {
  return Array.from({ length: MAX_GUEST_COUNT + 1 }, (_, index) => index)
}

export function guestCountOptionLabel(count: number): string {
  if (count === 0) return 'Just me'
  if (count === 1) return '1 guest'
  return `${count} guests`
}
