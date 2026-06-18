/** Roster suffix for extra guests, e.g. " +1 guest" or " +2 guests". */
export function formatGuestSuffix(guestCount: number): string {
  if (guestCount <= 0) return ''
  const label = guestCount === 1 ? 'guest' : 'guests'
  return ` +${guestCount} ${label}`
}
