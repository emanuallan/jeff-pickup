/** Distinct pickup days (signups on different dates) before we stop showing the badge. */
export const NEW_PLAYER_MAX_DISTINCT_DAYS = 3

export function isNewPlayerDistinctDays(distinctDays: number): boolean {
  return distinctDays >= 1 && distinctDays <= NEW_PLAYER_MAX_DISTINCT_DAYS
}
