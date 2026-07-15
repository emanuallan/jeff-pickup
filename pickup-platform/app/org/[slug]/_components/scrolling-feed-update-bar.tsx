'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { accentOnDark, hexToRgba, readableTextColor } from '@/lib/colors'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import type { PublicSponsor } from '@/lib/sponsorship'
import { safeExternalHref } from '@/lib/social-links'
import {
  apiItemsToTickerItems,
  appendSponsorToTickerItems,
  filterUnseenScrollingFeedItems,
  markScrollingFeedItemsSeen,
  parseScrollingFeedApiResponse,
  readScrollingFeedSeenKeys,
  scrollingFeedMarqueeDurationSeconds,
  type ScrollingFeedTickerItem,
} from '@/lib/scrolling-feed-update-bar'
import { OrgPublicPoweredByStrip } from './org-public-powered-by-strip'

type Props = {
  slug: string
  accent: string
  orgName: string
  orgLogoUrl?: string | null
  feedEnabled: boolean
  sponsors?: PublicSponsor[]
  compact?: boolean
}

type Phase = 'powered-by' | 'ticker'

function scheduleIdle(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(callback, { timeout: 1500 })
    return () => win.cancelIdleCallback?.(id)
  }

  const id = window.setTimeout(callback, 200)
  return () => window.clearTimeout(id)
}

function KindBadge({ kind, compact }: { kind: ScrollingFeedTickerItem['kind']; compact: boolean }) {
  const textClass = compact ? 'text-[8px]' : 'text-[9px]'

  if (kind === 'mvp') {
    return (
      <span
        className={`inline-flex shrink-0 rounded px-1 py-px font-semibold uppercase tracking-wide text-amber-200/90 ring-1 ring-inset ring-amber-500/25 ${textClass}`}
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
      >
        MVP
      </span>
    )
  }

  if (kind === 'player_stats') {
    return (
      <span
        className={`inline-flex shrink-0 rounded px-1 py-px font-semibold uppercase tracking-wide text-emerald-200/90 ring-1 ring-inset ring-emerald-500/25 ${textClass}`}
        style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
      >
        Stats
      </span>
    )
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded px-1 py-px font-semibold uppercase tracking-wide text-zinc-200/90 ring-1 ring-inset ring-white/15 ${textClass}`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
    >
      Partner
    </span>
  )
}

function TickerSegment({
  item,
  accent,
  compact,
}: {
  item: ScrollingFeedTickerItem
  accent: string
  compact: boolean
}) {
  const accentFg = accentOnDark(accent)
  const textClass = compact ? 'text-[10px]' : 'text-xs'
  const logoSize = compact ? 14 : 18

  let body: ReactNode

  if (item.kind === 'sponsor') {
    const logo = item.sponsorLogoUrl ? (
      <Image
        src={item.sponsorLogoUrl}
        alt=""
        width={logoSize}
        height={logoSize}
        className="rounded-sm object-contain"
        unoptimized
      />
    ) : null

    const label = (
      <span className="inline-flex items-center gap-1.5">
        {logo}
        <span className="font-medium text-zinc-200">{item.headline}</span>
      </span>
    )

    const href = item.sponsorUrl ? safeExternalHref(item.sponsorUrl) : null
    body = href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 transition hover:opacity-90"
      >
        {label}
      </a>
    ) : (
      label
    )
  } else {
    const headline = item.eventShortId ? (
      <Link
        href={orgPublicEventHref(item.eventShortId)}
        className="font-medium underline-offset-2 transition hover:underline"
        style={{ color: accentFg }}
      >
        {item.headline}
      </Link>
    ) : (
      <span className="font-medium" style={{ color: accentFg }}>
        {item.headline}
      </span>
    )

    body = (
      <>
        {headline}
        {item.dateLabel ? (
          <span className="text-zinc-500">{item.dateLabel}</span>
        ) : null}
      </>
    )
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${textClass}`}
      data-testid="scrolling-feed-segment"
    >
      <KindBadge kind={item.kind} compact={compact} />
      {body}
      <span className="text-zinc-700" aria-hidden>
        •
      </span>
    </span>
  )
}

function LiveChip({
  accent,
  orgName,
  orgLogoUrl,
  compact,
}: {
  accent: string
  orgName: string
  orgLogoUrl?: string | null
  compact: boolean
}) {
  const size = compact ? 16 : 20
  const initial = orgName.charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`relative z-10 flex shrink-0 items-center gap-1.5 border-r border-white/10 bg-zinc-950/90 ${
        compact ? 'pr-2' : 'pr-2.5'
      }`}
    >
      {orgLogoUrl ? (
        <Image
          src={orgLogoUrl}
          alt=""
          width={size}
          height={size}
          className="rounded-md object-cover"
          unoptimized
        />
      ) : (
        <span
          className={`inline-flex items-center justify-center rounded-md font-bold ${
            compact ? 'h-4 w-4 text-[8px]' : 'h-5 w-5 text-[10px]'
          }`}
          style={{ backgroundColor: accent, color: readableTextColor(accent) }}
        >
          {initial}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <span
          className="scrolling-feed-live-dot h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <span
          className={`font-bold uppercase tracking-wider ${
            compact ? 'text-[8px]' : 'text-[9px]'
          }`}
          style={{ color: accentOnDark(accent) }}
        >
          Live
        </span>
      </span>
    </div>
  )
}

function TickerTrack({
  items,
  accent,
  compact,
  animate,
  durationSeconds,
}: {
  items: ScrollingFeedTickerItem[]
  accent: string
  compact: boolean
  animate: boolean
  durationSeconds: number
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startTranslate: number
    currentTranslate: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const segments = items.map((item) => (
    <TickerSegment key={item.id} item={item} accent={accent} compact={compact} />
  ))

  const translatedX = (element: HTMLElement): number => {
    const transform = window.getComputedStyle(element).transform
    if (!transform || transform === 'none') return 0

    const matrix3d = transform.match(/^matrix3d\((.+)\)$/)
    if (matrix3d) {
      const values = matrix3d[1].split(',').map(Number)
      return Number.isFinite(values[12]) ? values[12] : 0
    }

    const matrix = transform.match(/^matrix\((.+)\)$/)
    if (matrix) {
      const values = matrix[1].split(',').map(Number)
      return Number.isFinite(values[4]) ? values[4] : 0
    }

    return 0
  }

  const normalizeTranslate = (translate: number, cycleWidth: number): number => {
    if (cycleWidth <= 0) return translate
    return ((translate % cycleWidth) - cycleWidth) % cycleWidth
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const track = trackRef.current
    if (!track) return

    const currentTranslate = translatedX(track)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTranslate: currentTranslate,
      currentTranslate,
      moved: false,
    }
    suppressClickRef.current = false
    track.style.animationName = 'none'
    track.style.transform = `translateX(${currentTranslate}px)`
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    const cycleWidth = track.scrollWidth / 2
    const nextTranslate = normalizeTranslate(drag.startTranslate + delta, cycleWidth)
    drag.currentTranslate = nextTranslate
    if (Math.abs(delta) > 4) {
      drag.moved = true
      suppressClickRef.current = true
    }
    track.style.transform = `translateX(${nextTranslate}px)`
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track || drag.pointerId !== event.pointerId) return

    const cycleWidth = track.scrollWidth / 2
    const normalized = normalizeTranslate(drag.currentTranslate, cycleWidth)
    const progress = cycleWidth > 0 ? -normalized / cycleWidth : 0

    track.style.transform = ''
    track.style.animationName = 'none'
    // Restart the CSS animation at the position where the user released it.
    void track.offsetWidth
    track.style.animationDelay = `${-(progress * durationSeconds)}s`
    track.style.animationName = 'scrolling-feed-marquee'

    if (drag.moved && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    setDragging(false)
  }

  if (!animate) {
    return (
      <div className="scrolling-feed-mask flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
        {segments}
      </div>
    )
  }

  return (
    <div
      className={`scrolling-feed-mask relative min-w-0 flex-1 overflow-hidden select-none touch-pan-y ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      data-testid="scrolling-feed-track-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClickRef.current = false
      }}
    >
      <div
        ref={trackRef}
        className="scrolling-feed-marquee-track flex w-max items-center gap-3"
        style={{ animationDuration: `${durationSeconds}s` }}
        data-testid="scrolling-feed-marquee-track"
      >
        <div className="flex items-center gap-3">{segments}</div>
        <div className="flex items-center gap-3" aria-hidden>
          {items.map((item) => (
            <TickerSegment
              key={`dup-${item.id}`}
              item={item}
              accent={accent}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ScrollingFeedUpdateBar({
  slug,
  accent,
  orgName,
  orgLogoUrl = null,
  feedEnabled,
  sponsors = [],
  compact = false,
}: Props) {
  const [phase, setPhase] = useState<Phase>('powered-by')
  const [items, setItems] = useState<ScrollingFeedTickerItem[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [visible, setVisible] = useState(true)
  const markedSeenRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!feedEnabled) return

    let cancelled = false
    let cancelIdle: (() => void) | null = null

    const loadTicker = () => {
      cancelIdle = scheduleIdle(async () => {
        if (cancelled) return
        try {
          const res = await fetch(`/api/org/${encodeURIComponent(slug)}/scrolling-feed`)
          if (!res.ok || cancelled) return
          const parsed = parseScrollingFeedApiResponse(await res.json())
          if (!parsed?.enabled || cancelled) return

          const tickerItems = apiItemsToTickerItems(parsed.items ?? [])
          const seen = readScrollingFeedSeenKeys(slug)
          const unseen = filterUnseenScrollingFeedItems(tickerItems, seen)
          if (unseen.length === 0 || cancelled) return

          const next = appendSponsorToTickerItems(unseen, sponsors)
          setVisible(false)
          window.setTimeout(() => {
            if (cancelled) return
            setItems(next)
            setPhase('ticker')
            setVisible(true)
          }, 160)
        } catch {
          // keep powered-by on network errors
        }
      })
    }

    if (document.readyState === 'complete') {
      loadTicker()
    } else {
      window.addEventListener('load', loadTicker, { once: true })
    }

    return () => {
      cancelled = true
      cancelIdle?.()
      window.removeEventListener('load', loadTicker)
    }
  }, [feedEnabled, slug, sponsors])

  useEffect(() => {
    if (phase !== 'ticker' || items.length === 0 || markedSeenRef.current) return
    markedSeenRef.current = true
    markScrollingFeedItemsSeen(slug, items)
  }, [phase, items, slug])

  const durationSeconds = useMemo(
    () => scrollingFeedMarqueeDurationSeconds(items.length),
    [items.length],
  )

  if (phase === 'ticker' && items.length > 0) {
    return (
      <div
        className={`scrolling-feed-update-bar relative overflow-hidden transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        } ${
          compact
            ? 'w-full py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]'
            : // Break out of the org home shell's horizontal padding so the ticker is full-bleed.
              'mt-5 -mx-5 w-auto py-1.5 sm:-mx-6'
        }`}
        style={{
          background: `linear-gradient(90deg, ${hexToRgba(accent, 0.14)} 0%, rgba(9,9,11,0.92) 42%, ${hexToRgba(accent, 0.08)} 100%)`,
          boxShadow: `inset 0 1px 0 0 ${hexToRgba(accent, 0.35)}`,
        }}
        role="region"
        aria-label="Group highlights"
        data-testid="scrolling-feed-update-bar"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.7)}, transparent)`,
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2 pl-2">
          <LiveChip
            accent={accent}
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            compact={compact}
          />
          <TickerTrack
            items={items}
            accent={accent}
            compact={compact}
            animate={!prefersReducedMotion}
            durationSeconds={durationSeconds}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${compact ? '' : 'border-t border-zinc-800/70 pt-5'}`}
      data-testid="scrolling-feed-powered-by"
    >
      <OrgPublicPoweredByStrip slug={slug} compact={compact} />
    </div>
  )
}
