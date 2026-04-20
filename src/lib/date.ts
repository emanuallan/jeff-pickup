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

export function formatLocalTime(hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) return hhmm
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const dt = new Date()
  dt.setHours(hours, minutes, 0, 0)
  return dt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

