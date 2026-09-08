/** Shared FormData field parsers for console server actions. */

export function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function parseOptionalMinParticipants(
  value: FormDataEntryValue | null,
): { value: number | null; error?: string } {
  const raw = String(value ?? '').trim()
  if (!raw) return { value: null }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 2 || n > 999) {
    return { value: null, error: 'Min participants must be between 2 and 999.' }
  }
  return { value: n }
}

export function validateCapacityVsMin(
  capacity: number | null,
  minPlayers: number | null,
): string | null {
  if (minPlayers != null && capacity != null && minPlayers > capacity) {
    return 'Min participants cannot exceed capacity.'
  }
  return null
}

/** Dollars input → cents. Blank or 0 = free (null). */
export function parseOptionalPriceCents(
  value: FormDataEntryValue | null,
): { value: number | null; error?: string } {
  const raw = String(value ?? '').trim()
  if (!raw) return { value: null }
  const dollars = Number.parseFloat(raw)
  if (!Number.isFinite(dollars) || dollars < 0) {
    return { value: null, error: 'Session price must be a valid amount (0 or more).' }
  }
  const cents = Math.round(dollars * 100)
  return { value: cents === 0 ? null : cents }
}
