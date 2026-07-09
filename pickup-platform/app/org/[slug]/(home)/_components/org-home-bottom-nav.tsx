'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import {
  orgPublicNavActiveKey,
  orgPublicTabHref,
  resolveCalEventId,
  type OrgPublicNavItem,
} from '@/lib/org-public-nav'
import { accentOnDark } from '@/lib/colors'
import { ORG_PUBLIC_CONTENT_MAX } from '@/lib/org-public-layout'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { OrganizerConsoleFooterLink } from '../../_components/organizer-console-footer-link'
import { OrgSponsorFooter } from '../../_components/org-sponsor-footer'
import type { PublicSponsor } from '@/lib/sponsorship'
import { IconLeaderboard, IconMatchday } from './org-home-nav-icons'

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
  isOrganizer?: boolean
  sponsors?: PublicSponsor[]
  showSponsorshipCta?: boolean
}

type Indicator = {
  left: number
  width: number
}

type NavTabsProps = {
  items: OrgPublicNavItem[]
  activeKey: string
  accent: string
  accentFg: string
  navRef: React.RefObject<HTMLElement | null>
  linkRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>
  indicator: Indicator | null
  placement: 'bottom' | 'top'
}

function NavIcon({ itemKey }: { itemKey: OrgPublicNavItem['key'] }) {
  if (itemKey === 'leaderboard') return <IconLeaderboard />
  return <IconMatchday />
}

function useOrgHomeNavIndicator(activeKey: string, navItems: OrgPublicNavItem[]) {
  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<Indicator | null>(null)

  const measureIndicator = useCallback(() => {
    const nav = navRef.current
    const activeLink = linkRefs.current.get(activeKey)
    if (!nav || !activeLink) {
      return
    }

    const navRect = nav.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    const inset = 12

    setIndicator({
      left: linkRect.left - navRect.left + inset,
      width: linkRect.width - inset * 2,
    })
  }, [activeKey])

  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator, navItems])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) {
      return
    }

    const observer = new ResizeObserver(() => measureIndicator())
    observer.observe(nav)
    for (const link of linkRefs.current.values()) {
      observer.observe(link)
    }

    window.addEventListener('resize', measureIndicator)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureIndicator)
    }
  }, [measureIndicator, navItems])

  return { navRef, linkRefs, indicator }
}

function OrgHomeNavTabs({
  items,
  activeKey,
  accent,
  accentFg,
  navRef,
  linkRefs,
  indicator,
  placement,
}: NavTabsProps) {
  const isTop = placement === 'top'

  return (
    <nav
      ref={navRef}
      aria-label="Group sections"
      className={`relative grid ${ORG_PUBLIC_CONTENT_MAX} ${
        isTop
          ? 'border-b border-zinc-800/80 pb-0'
          : 'border-t border-zinc-800/80 px-2 pt-1'
      }`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {indicator ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute rounded-full transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isTop
              ? 'bottom-0 h-0.5'
              : 'top-0 h-0.5'
          }`}
          style={{
            left: indicator.left,
            width: indicator.width,
            backgroundColor: accent,
          }}
        />
      ) : null}
      {items.map((item) => {
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
            className={`relative flex flex-col items-center gap-1 px-2 transition-colors ${
              isTop ? 'py-3' : 'py-2.5'
            } ${active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            style={active ? { color: accentFg } : undefined}
          >
            <NavIcon itemKey={item.key} />
            <span
              className={`font-medium leading-none tracking-wide ${
                isTop ? 'text-xs' : 'text-[10px]'
              }`}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function useOrgHomeNavState({ items, basePath }: Pick<Props, 'items' | 'basePath'>) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const cal = resolveCalEventId(searchParams.get('cal'), searchParams.get('ev'))
  const activeKey = orgPublicNavActiveKey(pathname, tab, basePath)

  const navItems = useMemo(
    () =>
      items.map((item) =>
        item.key === 'sessions'
          ? { ...item, href: orgPublicTabHref(basePath, 'sessions', cal) }
          : item,
      ),
    [items, basePath, cal],
  )

  return { navItems, activeKey, pathname, tab }
}

/** Fixed bottom chrome — mobile only. */
export function OrgHomeBottomNav({
  items,
  accent,
  basePath,
  slug,
  isOrganizer = false,
  sponsors = [],
  showSponsorshipCta = false,
}: Props) {
  const { navItems, activeKey } = useOrgHomeNavState({ items, basePath })
  const { navRef, linkRefs, indicator } = useOrgHomeNavIndicator(activeKey, navItems)

  if (navItems.length === 0) {
    return null
  }

  const showTabs = navItems.length > 1
  const accentFg = accentOnDark(accent)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-zinc-950/95 backdrop-blur-md md:hidden">
      {showTabs ? (
        <OrgHomeNavTabs
          items={navItems}
          activeKey={activeKey}
          accent={accent}
          accentFg={accentFg}
          navRef={navRef}
          linkRefs={linkRefs}
          indicator={indicator}
          placement="bottom"
        />
      ) : null}

      {isOrganizer ? (
        <footer className="relative border-t border-indigo-500/30 bg-zinc-950/95 shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
          <OrganizerConsoleFooterLink slug={slug} label="Back to console" />
        </footer>
      ) : slug === 'demo' ? (
        <footer className="relative border-t border-indigo-500/30 bg-zinc-950/95 shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
          <OrganizerConsoleFooterLink
            slug={slug}
            label="Back to Organizr"
            href={rootBaseUrl()}
          />
        </footer>
      ) : (
        <footer
          className={`mx-auto max-w-lg px-5 py-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] text-[10px] leading-none text-zinc-600 ${
            showTabs ? 'border-t border-white/10' : 'border-t border-zinc-800/80'
          }`}
        >
          <OrgSponsorFooter
            slug={slug}
            sponsors={sponsors}
            showCta={showSponsorshipCta}
            compact
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
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
          </div>
        </footer>
      )}
    </div>
  )
}

/** Inline tab bar — tablet and desktop only. */
export function OrgHomeDesktopNav({ items, accent, basePath }: Pick<Props, 'items' | 'accent' | 'basePath'>) {
  const { navItems, activeKey } = useOrgHomeNavState({ items, basePath })
  const { navRef, linkRefs, indicator } = useOrgHomeNavIndicator(activeKey, navItems)

  if (navItems.length <= 1) {
    return null
  }

  const accentFg = accentOnDark(accent)

  return (
    <div className="hidden md:block">
      <OrgHomeNavTabs
        items={navItems}
        activeKey={activeKey}
        accent={accent}
        accentFg={accentFg}
        navRef={navRef}
        linkRefs={linkRefs}
        indicator={indicator}
        placement="top"
      />
    </div>
  )
}
