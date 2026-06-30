/** Event cards hide the headcount chip until more than one person is signed up. */
export function showHeadcountChipOnCard(headcount: number): boolean {
  return headcount > 1
}
