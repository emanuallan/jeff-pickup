'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  hiddenTabHref,
  orgPublicNavActiveKey,
  type OrgPublicNavItem,
} from '@/lib/org-public-nav'
import { accentOnDark, hexToRgba } from '@/lib/colors'
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

type Indicator = {
  left: number
  top: number
  width: number
  height: number
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
  const trackRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<Indicator | null>(null)

  const navItems = useMemo(
    () =>
      items.map((item) =>
        item.key === 'sessions'
          ? { ...item, href: hiddenTabHref(basePath, 'sessions', ev) }
          : item,
      ),
    [items, basePath, ev],
  )

  const measureIndicator = useCallback(() => {
    const track = trackRef.current
    const activeLink = linkRefs.current.get(activeKey)
    if (!track || !activeLink) {
      return
    }

    setIndicator({
      left: activeLink.offsetLeft,
      top: activeLink.offsetTop,
      width: activeLink.offsetWidth,
      height: activeLink.offsetHeight,
    })
  }, [activeKey])

  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator, navItems, pathname, tab])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const observer = new ResizeObserver(() => measureIndicator())
    observer.observe(track)
    for (const link of linkRefs.current.values()) {
      observer.observe(link)
    }

    track.addEventListener('scroll', measureIndicator, { passive: true })
    window.addEventListener('resize', measureIndicator)

    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', measureIndicator)
      window.removeEventListener('resize', measureIndicator)
    }
  }, [measureIndicator, navItems])

  if (navItems.length === 0) {
    return null
  }

  const accentFg = accentOnDark(accent)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <nav
        aria-label="Group sections"
        className="mx-auto flex max-w-lg justify-center px-4 pb-2 pt-2.5"
      >
        <div
          ref={trackRef}
          className="relative inline-flex gap-1 rounded-full border border-zinc-800 bg-zinc-900/80 p-1 shadow-lg"
          style={{ borderColor: hexToRgba(accent, 0.12) }}
        >
          {indicator ? (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full transition-[left,width,top,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                left: indicator.left,
                top: indicator.top,
                width: indicator.width,
                height: indicator.height,
                backgroundColor: hexToRgba(accent, 0.22),
              }}
            />
          ) : null}

          {navItems.map((item) => {
            const active = item.key === activeKey
            return (
              <Link
                key={item.key}
                ref={(node) => {
                  if (node) {
                    linkRefs.current.set(item.key, node)
                  } else {
                    linkRefs.current.delete(item.key)
                  }
                }}
                href={item.href}
                scroll={item.key === 'sessions'}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={`relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                  active ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={active ? { color: accentFg } : undefined}
              >
                <NavIcon itemKey={item.key} />
              </Link>
            )
          })}
        </div>
      </nav>

      <footer className="mx-auto flex max-w-lg items-center justify-between gap-2 border-t border-white/10 px-5 py-1 pb-[max(0.125rem,env(safe-area-inset-bottom))] text-[10px] leading-none text-zinc-600">
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
