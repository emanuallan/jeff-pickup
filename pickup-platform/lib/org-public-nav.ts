export const HIDDEN_ORG_NAV_BASE = '/hidden'

export type HiddenTab = 'sessions' | 'leaderboard'

export type OrgPublicNavKey = HiddenTab

export type OrgPublicNavItem = {
  key: OrgPublicNavKey
  href: string
  label: string
}

export const HIDDEN_DEFAULT_TAB: HiddenTab = 'sessions'

export function hiddenTabHref(
  basePath: string,
  tab: HiddenTab,
  ev?: string | null,
): string {
  const params = new URLSearchParams()
  if (tab !== HIDDEN_DEFAULT_TAB) {
    params.set('tab', tab)
  }
  if (tab === 'sessions' && ev) {
    params.set('ev', ev)
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/** Map the current URL to the active bottom-nav tab. */
export function orgPublicNavActiveKey(
  pathname: string,
  tab: string | null | undefined,
  basePath: string,
): OrgPublicNavKey {
  if (!pathname.startsWith(basePath)) {
    return HIDDEN_DEFAULT_TAB
  }

  if (tab === 'leaderboard') {
    return 'leaderboard'
  }

  return HIDDEN_DEFAULT_TAB
}
