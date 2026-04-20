export function todayLocalISODate(): string {
  const d = new Date()
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000
  const local = new Date(d.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 10)
}

export function formatFriendlyDate(isoDate: string): string {
  // isoDate: YYYY-MM-DD
  const [y, m, d] = isoDate.split('-').map((x) => Number(x))
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

