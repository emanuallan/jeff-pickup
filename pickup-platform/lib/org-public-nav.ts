export const ORG_PUBLIC_NAV_BASE = '/'

export type OrgPublicTab = 'sessions' | 'leaderboard'

export type OrgPublicNavKey = OrgPublicTab

export type OrgPublicNavItem = {
  key: OrgPublicNavKey
  href: string
  label: string
}

export const ORG_PUBLIC_DEFAULT_TAB: OrgPublicTab = 'sessions'

/** @deprecated Use {@link ORG_PUBLIC_DEFAULT_TAB}. */
export const HIDDEN_DEFAULT_TAB = ORG_PUBLIC_DEFAULT_TAB

/** Public event deep link on the org home shell — e.g. `/?cal=ZbG6e5qK`. */
export function orgPublicEventHref(shortId: string, basePath = ORG_PUBLIC_NAV_BASE): string {
  const params = new URLSearchParams()
  params.set('cal', shortId)
  const query = params.toString()
  return basePath === '/' ? `/?${query}` : `${basePath}?${query}`
}

export function orgPublicTabHref(
  basePath: string,
  tab: OrgPublicTab,
  cal?: string | null,
): string {
  const params = new URLSearchParams()
  if (tab !== ORG_PUBLIC_DEFAULT_TAB) {
    params.set('tab', tab)
  }
  if (tab === 'sessions' && cal) {
    params.set('cal', cal)
  }
  const query = params.toString()
  if (!query) {
    return basePath
  }
  return basePath === '/' ? `/?${query}` : `${basePath}?${query}`
}

/** @deprecated Use {@link orgPublicTabHref}. */
export function hiddenTabHref(
  basePath: string,
  tab: OrgPublicTab,
  cal?: string | null,
): string {
  return orgPublicTabHref(basePath, tab, cal)
}

/** Canonical org home path from tab and session query params. */
export function orgHomeCanonicalPath(options: {
  tab?: string | null
  cal?: string | null
}): string {
  const params = new URLSearchParams()
  if (options.tab === 'leaderboard') {
    params.set('tab', 'leaderboard')
  }
  if (options.cal) {
    params.set('cal', options.cal)
  }
  const query = params.toString()
  return query ? `/?${query}` : '/'
}

/** Resolve selected session from `cal` (preferred) or legacy `ev`. */
export function resolveCalEventId(
  cal: string | null | undefined,
  ev: string | null | undefined,
): string | undefined {
  const id = cal ?? ev
  return id != null && id !== '' ? id : undefined
}

/** Map the current URL to the active bottom-nav tab. */
export function orgPublicNavActiveKey(
  pathname: string,
  tab: string | null | undefined,
  basePath: string,
): OrgPublicNavKey {
  if (basePath !== '/' && !pathname.startsWith(basePath)) {
    return ORG_PUBLIC_DEFAULT_TAB
  }

  if (tab === 'leaderboard') {
    return 'leaderboard'
  }

  return ORG_PUBLIC_DEFAULT_TAB
}
