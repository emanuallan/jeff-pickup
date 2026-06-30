'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { orgPublicNavActiveKey, type OrgPublicNavItem } from '@/lib/org-public-nav'
import { accentOnDark, hexToRgba } from '@/lib/colors'

type Props = {
  items: OrgPublicNavItem[]
  accent: string
  basePath: string
}

type Indicator = {
  left: number
  width: number
}

export function OrgPublicNav({ items, accent, basePath }: Props) {
  const pathname = usePathname()
  const activeKey = orgPublicNavActiveKey(pathname, basePath)
  const trackRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<Indicator | null>(null)

  const measureIndicator = useCallback(() => {
    const track = trackRef.current
    const activeLink = linkRefs.current.get(activeKey)
    if (!track || !activeLink) {
      return
    }

    const trackRect = track.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    setIndicator({
      left: linkRect.left - trackRect.left,
      width: linkRect.width,
    })
  }, [activeKey])

  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator, items, pathname])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const observer = new ResizeObserver(() => measureIndicator())
    observer.observe(track)
    window.addEventListener('resize', measureIndicator)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureIndicator)
    }
  }, [measureIndicator])

  if (items.length <= 1) {
    return null
  }

  const accentFg = accentOnDark(accent)

  return (
    <nav
      aria-label="Group sections"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mt-6 md:px-0 md:pt-0 md:pb-0"
    >
      <div
        ref={trackRef}
        className="relative inline-flex max-w-[min(100vw-2rem,24rem)] gap-0.5 overflow-x-auto rounded-full border border-zinc-800 bg-zinc-900/80 p-1 shadow-lg backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] md:max-w-full md:bg-zinc-900/60 md:shadow-none md:backdrop-blur-none [&::-webkit-scrollbar]:hidden"
        style={{ borderColor: hexToRgba(accent, 0.12) }}
      >
        {indicator ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 rounded-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
              backgroundColor: hexToRgba(accent, 0.22),
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
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
                active ? 'text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={active ? { color: accentFg } : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
