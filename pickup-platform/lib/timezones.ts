import { browserTimeZone } from '@/lib/datetime'

/** Curated IANA zones for the interior handoff picker (US-heavy; extend as needed). */
export const COMMON_ORG_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
] as const

export function orgTimezoneOptions(): string[] {
  const browser = browserTimeZone()
  const set = new Set<string>(COMMON_ORG_TIMEZONES)
  if (browser) {
    set.add(browser)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function formatTimezoneLabel(zone: string): string {
  return zone.replace(/_/g, ' ')
}
