/** Event cards hide the headcount chip until more than one person is signed up. */
export function showHeadcountChipOnCard(
  headcount: number,
  options?: { cancelled?: boolean },
): boolean {
  if (options?.cancelled) return false
  return headcount > 1
}

/**
 * Public "min N participants" chip — only while the session is still tentative.
 * Once status is on (auto or organizer override), the chip is confusing.
 */
export function showMinPlayersChip(
  minPlayers: number | null | undefined,
  status: string,
): boolean {
  return minPlayers != null && status === 'tentative'
}
