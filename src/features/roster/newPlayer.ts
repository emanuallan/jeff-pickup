/** Badge only when they have signed up on exactly one distinct date (their first game). */
export function isNewPlayerDistinctDays(distinctDays: number): boolean {
  return distinctDays === 1
}
