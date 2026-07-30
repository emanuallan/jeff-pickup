type QueryError = { code?: string | null; message?: string | null } | null

/**
 * Postgres `undefined_column`. Lets reads that request a newly added column
 * retry without it, so a not-yet-applied migration cannot blank out a page.
 */
export function isMissingColumnError(error: QueryError): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  return /column\b[^]*does not exist/i.test(error.message ?? '')
}
