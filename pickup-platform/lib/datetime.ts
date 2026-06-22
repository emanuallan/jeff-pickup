/**
 * Convert a datetime-local value (YYYY-MM-DDTHH:mm) in an IANA timezone to UTC ISO.
 * Used for one-off events created in the organizer console.
 */
export function localDateTimeInZoneToUtcIso(localDateTime: string, timeZone: string): string {
  const [datePart, timePart = '00:00'] = localDateTime.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hr, min] = timePart.split(':').map(Number)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const partsToUtcMs = (ms: number) => {
    const parts = formatter.formatToParts(new Date(ms))
    const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    return Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'))
  }

  const wanted = Date.UTC(y, m - 1, d, hr, min)
  let utc = wanted
  for (let i = 0; i < 3; i++) {
    utc += wanted - partsToUtcMs(utc)
  }

  return new Date(utc).toISOString()
}

/** datetime-local value (YYYY-MM-DDTHH:mm) for an instant in an IANA timezone. */
export function utcIsoToLocalDateTimeInput(iso: string, timeZone: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)

  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}`
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
