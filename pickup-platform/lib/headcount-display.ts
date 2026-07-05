/** Event cards hide the headcount chip until more than one person is signed up. */
export function showHeadcountChipOnCard(
  headcount: number,
  options?: { cancelled?: boolean },
): boolean {
  if (options?.cancelled) return false
  return headcount > 1
}
