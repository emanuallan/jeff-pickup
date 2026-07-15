import { describe, expect, it } from 'vitest'
import type { OrgSessionFeedItem } from '@/lib/org-session-feed'
import type { PublicSponsor } from '@/lib/sponsorship'
import {
  SCROLLING_FEED_SPONSOR_INTERVAL,
  SCROLLING_FEED_TICKER_LIMIT,
  apiItemsToTickerItems,
  buildScrollingFeedTickerItems,
  buildSponsorTickerItem,
  interleaveSponsorsIntoTickerItems,
  parseScrollingFeedApiResponse,
  pickWeightedSponsorForTicker,
  scrollingFeedItemKey,
  scrollingFeedMarqueeDurationSeconds,
  takeLatestScrollingFeedItems,
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
    expect(items[0].dateLabel).toMatch(/Jul 12/)
    expect(items[0].dateLabel).not.toMatch(/Jul 14/)
    expect(items[1].dateLabel).toMatch(/Jul 13/)
  })
})

describe('takeLatestScrollingFeedItems', () => {
  it('keeps only the first N items (newest-first)', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `item-${i}` }))
    expect(takeLatestScrollingFeedItems(many)).toHaveLength(SCROLLING_FEED_TICKER_LIMIT)
    expect(takeLatestScrollingFeedItems(many).map((item) => item.id)).toEqual(
      many.slice(0, 10).map((item) => item.id),
    )
    expect(takeLatestScrollingFeedItems(many, 3).map((item) => item.id)).toEqual([
      'item-0',
      'item-1',
      'item-2',
    ])
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

  const weightedSponsors = [
    { ...sponsor, id: 'low', monthly_amount_cents: 1000, sponsor_name: 'Low' },
    { ...sponsor, id: 'high', monthly_amount_cents: 9000, sponsor_name: 'High' },
  ]

  it('weights sponsor draws by contribution amount', () => {
    // Low owns the first 10% of the weighted range; high owns the other 90%.
    expect(pickWeightedSponsorForTicker(weightedSponsors, () => 0.05)?.id).toBe('low')
    expect(pickWeightedSponsorForTicker(weightedSponsors, () => 0.5)?.id).toBe('high')
  })

  it('excludes the previous sponsor when alternatives exist', () => {
    expect(pickWeightedSponsorForTicker(weightedSponsors, () => 0.5, 'high')?.id).toBe('low')
    expect(pickWeightedSponsorForTicker([sponsor], () => 0.5, sponsor.id)?.id).toBe(sponsor.id)
  })

  it('inserts one weighted sponsor after every five feed items', () => {
    const feed = Array.from({ length: 10 }, (_, index) => ({
      ...buildScrollingFeedTickerItems([mvpItem])[0],
      id: `feed-${index}`,
    }))
    const interleaved = interleaveSponsorsIntoTickerItems(
      feed,
      weightedSponsors,
      () => 0.5,
    )

    expect(SCROLLING_FEED_SPONSOR_INTERVAL).toBe(5)
    expect(interleaved).toHaveLength(12)
    expect(interleaved[5]).toMatchObject({ kind: 'sponsor', headline: 'Brought to you by High' })
    expect(interleaved[11]).toMatchObject({ kind: 'sponsor', headline: 'Brought to you by Low' })
    expect(interleaved[5].id).not.toBe(interleaved[11].id)
  })

  it('does not insert a sponsor before five feed items or without sponsors', () => {
    const shortFeed = Array.from({ length: 4 }, (_, index) => ({
      ...buildScrollingFeedTickerItems([mvpItem])[0],
      id: `feed-${index}`,
    }))
    expect(interleaveSponsorsIntoTickerItems(shortFeed, [sponsor])).toEqual(shortFeed)
    expect(interleaveSponsorsIntoTickerItems(shortFeed, [])).toEqual(shortFeed)
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
