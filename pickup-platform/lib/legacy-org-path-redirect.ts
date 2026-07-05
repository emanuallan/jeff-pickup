import { isCalAssetSegment } from '@/lib/org-public-nav'

export type LegacyOrgPathRedirect = {
  pathname: string
  searchParams: Record<string, string>
}

/** Legacy public URLs — redirect targets for the org home shell. */
export function getLegacyOrgPathRedirect(pathname: string): LegacyOrgPathRedirect | null {
  if (pathname === '/cal' || pathname === '/events') {
    return { pathname: '/', searchParams: {} }
  }

  if (pathname === '/leaderboard') {
    return { pathname: '/', searchParams: { tab: 'leaderboard' } }
  }

  const calEvent = /^\/cal\/([^/]+)$/.exec(pathname)
  if (calEvent && !isCalAssetSegment(calEvent[1])) {
    return { pathname: '/', searchParams: { cal: calEvent[1] } }
  }

  const legacyEvent = /^\/events\/([^/]+)$/.exec(pathname)
  if (legacyEvent) {
    return { pathname: '/', searchParams: { cal: legacyEvent[1] } }
  }

  const apexCal = /^(\/org\/[^/]+)\/cal$/.exec(pathname)
  if (apexCal) {
    return { pathname: apexCal[1], searchParams: {} }
  }

  const apexLeaderboard = /^(\/org\/[^/]+)\/leaderboard$/.exec(pathname)
  if (apexLeaderboard) {
    return { pathname: apexLeaderboard[1], searchParams: { tab: 'leaderboard' } }
  }

  const apexCalEvent = /^(\/org\/[^/]+)\/cal\/([^/]+)$/.exec(pathname)
  if (apexCalEvent && !isCalAssetSegment(apexCalEvent[2])) {
    return { pathname: apexCalEvent[1], searchParams: { cal: apexCalEvent[2] } }
  }

  const apexEvents = /^(\/org\/[^/]+)\/events$/.exec(pathname)
  if (apexEvents) {
    return { pathname: apexEvents[1], searchParams: {} }
  }

  const apexLegacyEvent = /^(\/org\/[^/]+)\/events\/([^/]+)$/.exec(pathname)
  if (apexLegacyEvent) {
    return { pathname: apexLegacyEvent[1], searchParams: { cal: apexLegacyEvent[2] } }
  }

  return null
}
