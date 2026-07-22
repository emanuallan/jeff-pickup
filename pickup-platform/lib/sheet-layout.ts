/**
 * Use sheet (not desktop dialog/dropdown) layout when the viewport is narrow
 * OR short — covers phones, landscape phones, and foldables at full width.
 */
export const COMPACT_SHEET_MEDIA_QUERY = '(max-width: 639px), (max-height: 720px)'

export function matchesCompactSheetLayout(
  matchMedia: (query: string) => { matches: boolean } = globalThis.matchMedia?.bind(globalThis),
): boolean {
  if (typeof matchMedia !== 'function') return false
  return matchMedia(COMPACT_SHEET_MEDIA_QUERY).matches
}
