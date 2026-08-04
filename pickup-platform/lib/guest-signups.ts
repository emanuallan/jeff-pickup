/** App-side guest cap for join forms and console roster editing. */
export const MAX_GUEST_COUNT = 5

export function clampGuestCount(count: number): number {
  if (!Number.isFinite(count)) return 0
  return Math.max(0, Math.min(MAX_GUEST_COUNT, Math.floor(count)))
}

export function resolveGuestCount(count: number, guestsEnabled: boolean): number {
  return guestsEnabled ? clampGuestCount(count) : 0
}

/**
 * Parse an optional guest count from a bot command arg (e.g. `/in 2`).
 * Returns null when omitted or not a non-negative integer.
 */
export function parseOptionalGuestCountArg(raw: string | undefined | null): number | null {
  const token = raw?.trim().split(/\s+/)[0]
  if (!token) return null
  if (!/^\d+$/.test(token)) return null
  return Number.parseInt(token, 10)
}

export function guestCountOptions(): number[] {
  return Array.from({ length: MAX_GUEST_COUNT + 1 }, (_, index) => index)
}

export function guestCountOptionLabel(count: number): string {
  if (count === 0) return 'Just me'
  if (count === 1) return '1 guest'
  return `${count} guests`
}
