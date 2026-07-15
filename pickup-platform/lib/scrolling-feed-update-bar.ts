import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import {
  formatFeedSessionDate,
  formatMvpFeedHeadline,
  formatPlayerStatsFeedHeadline,
} from '@/lib/org-session-feed'
import type { PublicSponsor } from '@/lib/sponsorship'

/** How many recent feed highlights to show in the ticker. */
export const SCROLLING_FEED_TICKER_LIMIT = 10
export const SCROLLING_FEED_SPONSOR_INTERVAL = 5

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

export function buildSponsorTickerItem(
  sponsor: PublicSponsor,
  occurrence?: number,
): ScrollingFeedTickerItem {
  return {
    id: `sponsor:${sponsor.id}${occurrence == null ? '' : `:${occurrence}`}`,
    kind: 'sponsor',
    headline: `Brought to you by ${sponsor.sponsor_name}`,
    eventShortId: null,
    dateLabel: null,
    sponsorLogoUrl: sponsor.logo_url,
    sponsorUrl: sponsor.sponsor_url,
  }
}

/**
 * Weighted sponsor draw: contribution amount is the weight, so a $90 sponsor
 * has nine times the odds of a $10 sponsor. When an earlier sponsor is
 * excluded and alternatives exist, weighting applies among the remainder.
 */
export function pickWeightedSponsorForTicker(
  sponsors: PublicSponsor[],
  random: () => number = Math.random,
  excludeSponsorId?: string | null,
): PublicSponsor | null {
  if (sponsors.length === 0) return null

  const eligible =
    sponsors.length > 1 && excludeSponsorId
      ? sponsors.filter((sponsor) => sponsor.id !== excludeSponsorId)
      : sponsors
  const weighted = eligible.map((sponsor) => ({
    sponsor,
    weight: Math.max(1, sponsor.monthly_amount_cents ?? 0),
  }))
  const totalWeight = weighted.reduce((total, entry) => total + entry.weight, 0)
  const draw = Math.min(Math.max(random(), 0), 0.999999999) * totalWeight

  let cursor = 0
  for (const entry of weighted) {
    cursor += entry.weight
    if (draw < cursor) return entry.sponsor
  }

  return weighted.at(-1)?.sponsor ?? null
}

/** Insert a weighted sponsor after every N feed items. */
export function interleaveSponsorsIntoTickerItems(
  feedItems: ScrollingFeedTickerItem[],
  sponsors: PublicSponsor[],
  random: () => number = Math.random,
  interval = SCROLLING_FEED_SPONSOR_INTERVAL,
): ScrollingFeedTickerItem[] {
  if (sponsors.length === 0 || interval <= 0) return feedItems

  const result: ScrollingFeedTickerItem[] = []
  let previousSponsorId: string | null = null
  let sponsorOccurrence = 0

  feedItems.forEach((item, index) => {
    result.push(item)
    if ((index + 1) % interval !== 0) return

    const sponsor = pickWeightedSponsorForTicker(sponsors, random, previousSponsorId)
    if (!sponsor) return

    result.push(buildSponsorTickerItem(sponsor, sponsorOccurrence))
    previousSponsorId = sponsor.id
    sponsorOccurrence += 1
  })

  return result
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
