import {
  clampGuestCount,
  guestCountOptions,
  MAX_GUEST_COUNT,
} from '@/lib/guest-signups'

export { MAX_GUEST_COUNT as CONSOLE_MAX_GUEST_COUNT }

export const clampConsoleGuestCount = clampGuestCount

export const consoleGuestCountOptions = guestCountOptions

export function consoleGuestCountOptionLabel(count: number): string {
  if (count === 0) return 'No guests'
  if (count === 1) return '1 guest'
  return `${count} guests`
}
