'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { orgPublicNavActiveKey, type OrgPublicNavItem } from '@/lib/org-public-nav'
import { hexToRgba, readableTextColor } from '@/lib/colors'

type Props = {
  items: OrgPublicNavItem[]
  accent: string
  basePath: string
}

type Indicator = {
  left: number
  top: number
  width: number
  height: number
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

    setIndicator({
      left: activeLink.offsetLeft,
      top: activeLink.offsetTop,
      width: activeLink.offsetWidth,
      height: activeLink.offsetHeight,
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
  }, [measureIndicator, items])

  if (items.length <= 1) {
    return null
  }

  const activeLabelColor = readableTextColor(accent)
  const trackBorder = hexToRgba(accent, 0.38)
  const indicatorFill = hexToRgba(accent, 0.52)
  const indicatorGlow = hexToRgba(accent, 0.42)

  return (
    <>
      {/* Mobile — fade so the dock separates from page content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-zinc-950 from-40% via-zinc-950/70 to-transparent md:hidden"
      />

      <nav
        aria-label="Group sections"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mt-6 md:px-0 md:pt-0 md:pb-0"
      >
        <div
          ref={trackRef}
          className="relative inline-flex max-w-[min(100vw-2rem,24rem)] gap-1 overflow-x-auto rounded-full border bg-zinc-950/95 p-1 shadow-[0_10px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] md:max-w-full md:bg-zinc-900/90 md:shadow-[0_4px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] md:backdrop-blur-md [&::-webkit-scrollbar]:hidden"
          style={{
            borderColor: trackBorder,
            boxShadow: `0 10px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 20px ${hexToRgba(accent, 0.12)}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
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
                backgroundColor: indicatorFill,
                boxShadow: `0 2px 12px ${indicatorGlow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
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
                className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                  active ? 'font-semibold' : 'font-medium text-zinc-500 hover:text-zinc-300'
                }`}
                style={active ? { color: activeLabelColor } : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
