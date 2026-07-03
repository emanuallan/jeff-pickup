'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  hiddenTabHref,
  orgPublicNavActiveKey,
  type OrgPublicNavItem,
} from '@/lib/org-public-nav'
import { accentOnDark } from '@/lib/colors'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { IconLeaderboard, IconMatchday } from './hidden-nav-icons'

function rootBaseUrl(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return `https://${root}`
}

type Props = {
  items: OrgPublicNavItem[]
  accent: string
  basePath: string
  slug: string
}

function NavIcon({ itemKey }: { itemKey: OrgPublicNavItem['key'] }) {
  if (itemKey === 'leaderboard') return <IconLeaderboard />
  return <IconMatchday />
}

export function HiddenBottomNav({ items, accent, basePath, slug }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const ev = searchParams.get('ev')
  const activeKey = orgPublicNavActiveKey(pathname, tab, basePath)

  const navItems = useMemo(
    () =>
      items.map((item) =>
        item.key === 'sessions'
          ? { ...item, href: hiddenTabHref(basePath, 'sessions', ev) }
          : item,
      ),
    [items, basePath, ev],
  )

  if (navItems.length === 0) {
    return null
  }

  const showTabs = navItems.length > 1
  const accentFg = accentOnDark(accent)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-zinc-950/95 backdrop-blur-md">
      {showTabs ? (
        <nav
          aria-label="Group sections"
          className="mx-auto grid max-w-lg border-t border-zinc-800/80 px-2 pt-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active = item.key === activeKey
            return (
              <Link
                key={item.key}
                href={item.href}
                scroll={item.key === 'sessions'}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 px-2 py-2.5 transition-colors ${
                  active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={active ? { color: accentFg } : undefined}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                ) : null}
                <NavIcon itemKey={item.key} />
                <span className="text-[10px] font-medium leading-none tracking-wide">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      ) : null}

      <footer
        className={`mx-auto flex max-w-lg items-center justify-between gap-2 px-5 py-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] text-[10px] leading-none text-zinc-600 ${
          showTabs ? 'border-t border-white/10' : 'border-t border-zinc-800/80'
        }`}
      >
        <p className="truncate font-medium tracking-wide">
          {slug}.{getRootDomain()}
        </p>
        <a
          href={rootBaseUrl()}
          title="Create your own group on Organizr"
          className="inline-flex shrink-0 items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-400"
        >
          <span>Powered by</span>
          <OrganizrLogo size={12} showWordmark wordmarkClassName="font-medium text-zinc-500" />
        </a>
      </footer>
    </div>
  )
}
