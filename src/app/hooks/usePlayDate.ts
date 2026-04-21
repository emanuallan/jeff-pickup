import { useEffect, useState } from 'react'
import { todayLocalISODate } from '../../lib/date'

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map((x) => Number(x))
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function getInitialPlayDate(): string {
  const fallback = todayLocalISODate()
  try {
    const url = new URL(window.location.href)
    const dateParam = url.searchParams.get('date')?.trim()
    return dateParam && isValidISODate(dateParam) ? dateParam : fallback
  } catch {
    return fallback
  }
}

export function usePlayDate() {
  const [playDate, setPlayDate] = useState(() => getInitialPlayDate())

  useEffect(() => {
    // Keep URL in sync with the currently selected date.
    try {
      const url = new URL(window.location.href)
      const next = isValidISODate(playDate) ? playDate : todayLocalISODate()
      if (url.searchParams.get('date') !== next) {
        url.searchParams.set('date', next)
        window.history.replaceState(null, '', url.toString())
      }
    } catch {
      // ignore; URL sync is best-effort
    }
  }, [playDate])

  return [playDate, setPlayDate] as const
}

