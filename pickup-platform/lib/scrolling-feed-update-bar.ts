import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import {
  formatFeedSessionDate,
  formatMvpFeedHeadline,
  formatPlayerStatsFeedHeadline,
} from '@/lib/org-session-feed'
import type { PublicSponsor } from '@/lib/sponsorship'
import { sortPublicSponsorsByAmount } from '@/lib/sponsorship'

/** How many recent feed highlights to show in the ticker. */
export const SCROLLING_FEED_TICKER_LIMIT = 10

/** Minimum time the Powered-by intro stays visible before the ticker.
 * Covers one letter-sweep + Organizr flash (2.8s) plus stagger for ~18 letters. */
export const SCROLLING_FEED_INTRO_MIN_MS = 4200

export type ScrollingFeedTickerKind = 'mvp' | 'player_stats' | 'sponsor'

export type ScrollingFeedTickerItem = {
  id: string
  kind: ScrollingFeedTickerKind
  headline: string
  eventShortId: string | null
  dateLabel: string | null
  sponsorLogoUrl?: string | null
  sponsorUrl?: string | null
}

export type ScrollingFeedApiItem = {
  id: string
  kind: 'mvp' | 'player_stats'
  headline: string
  eventShortId: string
  dateLabel: string
}

export type ScrollingFeedApiResponse = {
  enabled: boolean
  items?: ScrollingFeedApiItem[]
}

export function scrollingFeedItemKey(item: OrgSessionFeedItem): string {
  if (item.kind === 'mvp') {
    return `mvp:${item.event_id}`
  }
  return `player_stats:${item.event_id}:${item.participant_id}`
}

export function buildScrollingFeedTickerItems(
  items: OrgSessionFeedItem[],
): ScrollingFeedTickerItem[] {
  return items.map((item) => {
    if (item.kind === 'mvp') {
      return {
        id: scrollingFeedItemKey(item),
        kind: 'mvp',
        headline: formatMvpFeedHeadline(item),
        eventShortId: item.event_short_id,
        dateLabel: formatFeedSessionDate(item),
      }
    }

    return {
      id: scrollingFeedItemKey(item),
      kind: 'player_stats',
      headline: formatPlayerStatsFeedHeadline(item),
      eventShortId: item.event_short_id,
      dateLabel: formatFeedSessionDate(item),
    }
  })
}

/** Keep the most recent N feed items (RPC already returns newest-first). */
export function takeLatestScrollingFeedItems<T>(
  items: T[],
  limit = SCROLLING_FEED_TICKER_LIMIT,
): T[] {
  return items.slice(0, Math.max(0, limit))
}

export function buildSponsorTickerItem(sponsor: PublicSponsor): ScrollingFeedTickerItem {
  return {
    id: `sponsor:${sponsor.id}`,
    kind: 'sponsor',
    headline: `Brought to you by ${sponsor.sponsor_name}`,
    eventShortId: null,
    dateLabel: null,
    sponsorLogoUrl: sponsor.logo_url,
    sponsorUrl: sponsor.sponsor_url,
  }
}

/** Top sponsor by monthly amount for ticker attribution. */
export function pickTopSponsorForTicker(sponsors: PublicSponsor[]): PublicSponsor | null {
  if (sponsors.length === 0) return null
  return sortPublicSponsorsByAmount(sponsors)[0] ?? null
}

export function appendSponsorToTickerItems(
  feedItems: ScrollingFeedTickerItem[],
  sponsors: PublicSponsor[],
): ScrollingFeedTickerItem[] {
  const top = pickTopSponsorForTicker(sponsors)
  if (!top) return feedItems
  return [...feedItems, buildSponsorTickerItem(top)]
}

export function parseScrollingFeedApiResponse(raw: unknown): ScrollingFeedApiResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (typeof value.enabled !== 'boolean') return null

  if (!value.enabled) {
    return { enabled: false }
  }

  if (!Array.isArray(value.items)) {
    return { enabled: true, items: [] }
  }

  const items: ScrollingFeedApiItem[] = []
  for (const entry of value.items) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    if (row.kind !== 'mvp' && row.kind !== 'player_stats') continue
    if (typeof row.headline !== 'string') continue
    if (typeof row.eventShortId !== 'string') continue
    if (typeof row.dateLabel !== 'string') continue
    items.push({
      id: row.id,
      kind: row.kind,
      headline: row.headline,
      eventShortId: row.eventShortId,
      dateLabel: row.dateLabel,
    })
  }

  return { enabled: true, items }
}

export function apiItemsToTickerItems(items: ScrollingFeedApiItem[]): ScrollingFeedTickerItem[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    headline: item.headline,
    eventShortId: item.eventShortId,
    dateLabel: item.dateLabel,
  }))
}

/** Duration in seconds for one seamless marquee loop, based on item count. */
export function scrollingFeedMarqueeDurationSeconds(itemCount: number): number {
  const base = 28
  const perItem = 8
  return Math.min(90, Math.max(32, base + itemCount * perItem))
}
