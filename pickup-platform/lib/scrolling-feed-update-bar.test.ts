import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import type { PublicSponsor } from '@/lib/sponsorship'
import {
  SCROLLING_FEED_SEEN_CAP,
  SCROLLING_FEED_SEEN_STORAGE_PREFIX,
  apiItemsToTickerItems,
  appendSponsorToTickerItems,
  buildScrollingFeedTickerItems,
  buildSponsorTickerItem,
  filterUnseenScrollingFeedItems,
  markScrollingFeedItemsSeen,
  parseScrollingFeedApiResponse,
  parseScrollingFeedSeenKeys,
  pickTopSponsorForTicker,
  readScrollingFeedSeenKeys,
  scrollingFeedItemKey,
  scrollingFeedMarqueeDurationSeconds,
  scrollingFeedSeenStorageKey,
  trimScrollingFeedSeenKeys,
  writeScrollingFeedSeenKeys,
} from './scrolling-feed-update-bar'

const mvpItem: OrgSessionFeedItem = {
  kind: 'mvp',
  occurred_at: '2026-07-14T18:00:00.000Z',
  event_id: 'event-1',
  event_short_id: 'abc123',
  event_label: 'Sunday session',
  event_starts_at: '2026-07-12T22:00:00.000Z',
  event_timezone: 'America/New_York',
  total_votes: 5,
  winners: [{ participant_id: 'p1', display_name: 'Alex', vote_count: 3 }],
  nominees: [],
  reactions: [],
}

const statsItem: OrgSessionFeedItem = {
  kind: 'player_stats',
  occurred_at: '2026-07-15T18:00:00.000Z',
  event_id: 'event-2',
  event_short_id: 'def456',
  event_label: 'Wednesday session',
  event_starts_at: '2026-07-13T22:00:00.000Z',
  event_timezone: 'America/New_York',
  participant_id: 'p2',
  display_name: 'Sam',
  goals: 2,
  assists: 1,
  reactions: [],
}

const sponsor: PublicSponsor = {
  id: 'sponsor-1',
  sponsor_name: 'Acme Sports',
  logo_url: 'https://example.com/logo.png',
  sponsor_url: 'https://acme.example',
  monthly_amount_cents: 5000,
}

describe('scrollingFeedItemKey', () => {
  it('builds stable keys for mvp and player_stats', () => {
    expect(scrollingFeedItemKey(mvpItem)).toBe('mvp:event-1')
    expect(scrollingFeedItemKey(statsItem)).toBe('player_stats:event-2:p2')
  })
})

describe('buildScrollingFeedTickerItems', () => {
  it('maps feed items to headlines and session dates (not post times)', () => {
    const items = buildScrollingFeedTickerItems([mvpItem, statsItem])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'mvp:event-1',
      kind: 'mvp',
      headline: 'Alex is session MVP',
      eventShortId: 'abc123',
    })
    expect(items[1]).toMatchObject({
      id: 'player_stats:event-2:p2',
      kind: 'player_stats',
      headline: 'Sam — 2 goals, 1 assist',
      eventShortId: 'def456',
    })
    // Session was Jul 12 ET; post/finalize was Jul 14 — ticker must use session date.
    expect(items[0].dateLabel).toMatch(/Jul 12/)
    expect(items[0].dateLabel).not.toMatch(/Jul 14/)
    expect(items[1].dateLabel).toMatch(/Jul 13/)
  })
})

describe('filterUnseenScrollingFeedItems', () => {
  it('keeps only items not in the seen set', () => {
    const items = buildScrollingFeedTickerItems([mvpItem, statsItem])
    const unseen = filterUnseenScrollingFeedItems(items, new Set(['mvp:event-1']))
    expect(unseen.map((item) => item.id)).toEqual(['player_stats:event-2:p2'])
  })
})

describe('sponsor ticker helpers', () => {
  it('builds a brought-to-you-by sponsor segment', () => {
    expect(buildSponsorTickerItem(sponsor)).toEqual({
      id: 'sponsor:sponsor-1',
      kind: 'sponsor',
      headline: 'Brought to you by Acme Sports',
      eventShortId: null,
      dateLabel: null,
      sponsorLogoUrl: 'https://example.com/logo.png',
      sponsorUrl: 'https://acme.example',
    })
  })

  it('picks the top sponsor by amount', () => {
    const top = pickTopSponsorForTicker([
      { ...sponsor, id: 'low', monthly_amount_cents: 1000, sponsor_name: 'Low' },
      { ...sponsor, id: 'high', monthly_amount_cents: 9000, sponsor_name: 'High' },
    ])
    expect(top?.id).toBe('high')
  })

  it('appends one sponsor segment after feed items', () => {
    const feed = buildScrollingFeedTickerItems([mvpItem])
    const withSponsor = appendSponsorToTickerItems(feed, [sponsor])
    expect(withSponsor).toHaveLength(2)
    expect(withSponsor[1].kind).toBe('sponsor')
  })

  it('does not append when there are no sponsors', () => {
    const feed = buildScrollingFeedTickerItems([mvpItem])
    expect(appendSponsorToTickerItems(feed, [])).toEqual(feed)
  })
})

describe('seen key localStorage helpers', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a per-slug storage key', () => {
    expect(scrollingFeedSeenStorageKey('jeff')).toBe(`${SCROLLING_FEED_SEEN_STORAGE_PREFIX}jeff`)
  })

  it('parses and trims seen keys', () => {
    expect(parseScrollingFeedSeenKeys(null)).toEqual([])
    expect(parseScrollingFeedSeenKeys('not-json')).toEqual([])
    expect(parseScrollingFeedSeenKeys('["a","b"]')).toEqual(['a', 'b'])

    const many = Array.from({ length: SCROLLING_FEED_SEEN_CAP + 5 }, (_, i) => `k${i}`)
    const trimmed = trimScrollingFeedSeenKeys(many)
    expect(trimmed).toHaveLength(SCROLLING_FEED_SEEN_CAP)
    expect(trimmed[0]).toBe('k5')
  })

  it('reads and writes seen keys with FIFO trim', () => {
    writeScrollingFeedSeenKeys('jeff', ['mvp:event-1'])
    expect(readScrollingFeedSeenKeys('jeff')).toEqual(new Set(['mvp:event-1']))

    writeScrollingFeedSeenKeys('jeff', ['player_stats:event-2:p2'])
    expect(readScrollingFeedSeenKeys('jeff')).toEqual(
      new Set(['mvp:event-1', 'player_stats:event-2:p2']),
    )

    const overflow = Array.from({ length: SCROLLING_FEED_SEEN_CAP + 2 }, (_, i) => `extra:${i}`)
    writeScrollingFeedSeenKeys('jeff', overflow)
    const seen = [...readScrollingFeedSeenKeys('jeff')]
    expect(seen).toHaveLength(SCROLLING_FEED_SEEN_CAP)
    expect(seen.includes('mvp:event-1')).toBe(false)
  })

  it('marks feed items seen but skips sponsor ids', () => {
    markScrollingFeedItemsSeen('jeff', [
      { id: 'mvp:event-1' },
      { id: 'sponsor:sponsor-1' },
    ])
    expect(readScrollingFeedSeenKeys('jeff')).toEqual(new Set(['mvp:event-1']))
  })
})

describe('parseScrollingFeedApiResponse', () => {
  it('parses disabled and enabled payloads', () => {
    expect(parseScrollingFeedApiResponse({ enabled: false })).toEqual({ enabled: false })
    expect(
      parseScrollingFeedApiResponse({
        enabled: true,
        items: [
          {
            id: 'mvp:event-1',
            kind: 'mvp',
            headline: 'Alex is session MVP',
            eventShortId: 'abc123',
            dateLabel: 'Sun, Jul 12',
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      items: [
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ],
    })
  })

  it('rejects invalid payloads', () => {
    expect(parseScrollingFeedApiResponse(null)).toBeNull()
    expect(parseScrollingFeedApiResponse({})).toBeNull()
  })
})

describe('apiItemsToTickerItems / marquee duration', () => {
  it('maps api items and scales duration', () => {
    expect(
      apiItemsToTickerItems([
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ]),
    ).toEqual([
      {
        id: 'mvp:event-1',
        kind: 'mvp',
        headline: 'Alex is session MVP',
        eventShortId: 'abc123',
        dateLabel: 'Sun, Jul 12',
      },
    ])

    expect(scrollingFeedMarqueeDurationSeconds(1)).toBeGreaterThanOrEqual(32)
    expect(scrollingFeedMarqueeDurationSeconds(20)).toBeLessThanOrEqual(90)
  })
})
