/** Platform operator — interior-only console tools (co-owner handoff, etc.). */
export const INTERIOR_OPERATOR_USER_ID = '23f1a201-aafe-4fd6-826d-3f753f092d33' as const

export function isInteriorOperator(userId: string | null | undefined): boolean {
  return userId === INTERIOR_OPERATOR_USER_ID
}
