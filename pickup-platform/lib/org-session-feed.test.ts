import { describe, expect, it } from 'vitest'
import type { OrgSettings } from '@/lib/org-features'
import {
  formatFeedItemDate,
  formatMvpFeedHeadline,
  formatPlayerStatsFeedHeadline,
  formatPlayerStatsInline,
  isOrgSessionFeedEnabled,
  parseOrgSessionFeed,
  parseOrgSessionFeedItem,
  shouldIncludeMvpFeedItem,
} from './org-session-feed'

describe('shouldIncludeMvpFeedItem', () => {
  it('excludes zero-vote MVP finalizations', () => {
    expect(shouldIncludeMvpFeedItem(0)).toBe(false)
    expect(shouldIncludeMvpFeedItem(1)).toBe(true)
  })
})

describe('isOrgSessionFeedEnabled', () => {
  it('is off when session feedback is disabled', () => {
    expect(
      isOrgSessionFeedEnabled({
        settings: {
          features: {
            session_feedback: false,
            session_mvp_voting: true,
            session_player_stats: true,
          },
        } as OrgSettings,
      }),
    ).toBe(false)
  })

  it('is on when feedback is on and either debrief feature is on', () => {
    expect(
      isOrgSessionFeedEnabled({
        settings: {
          features: {
            session_feedback: true,
            session_mvp_voting: true,
            session_player_stats: false,
          },
        } as OrgSettings,
      }),
    ).toBe(true)

    expect(
      isOrgSessionFeedEnabled({
        settings: {
          features: {
            session_feedback: true,
            session_mvp_voting: false,
            session_player_stats: true,
          },
        } as OrgSettings,
      }),
    ).toBe(true)
  })

  it('is off when both mvp and stats are disabled', () => {
    expect(
      isOrgSessionFeedEnabled({
        settings: {
          features: {
            session_feedback: true,
            session_mvp_voting: false,
            session_player_stats: false,
          },
        } as OrgSettings,
      }),
    ).toBe(false)
  })
})

describe('parseOrgSessionFeedItem', () => {
  it('parses mvp feed items', () => {
    const item = parseOrgSessionFeedItem({
      kind: 'mvp',
      occurred_at: '2026-07-12T18:00:00.000Z',
      event_id: 'event-1',
      event_short_id: 'abc123',
      event_label: 'Saturday pickup',
      total_votes: 8,
      winners: [
        {
          participant_id: 'p1',
          display_name: 'Alex',
          vote_count: 5,
        },
      ],
      nominees: [
        {
          participant_id: 'p1',
          display_name: 'Alex',
          vote_count: 5,
          is_winner: true,
        },
        {
          participant_id: 'p2',
          display_name: 'Sam',
          vote_count: 3,
          is_winner: false,
        },
      ],
      reactions: [],
    })

    expect(item).toEqual({
      kind: 'mvp',
      occurred_at: '2026-07-12T18:00:00.000Z',
      event_id: 'event-1',
      event_short_id: 'abc123',
      event_label: 'Saturday pickup',
      total_votes: 8,
      winners: [
        {
          participant_id: 'p1',
          display_name: 'Alex',
          vote_count: 5,
        },
      ],
      nominees: [
        {
          participant_id: 'p1',
          display_name: 'Alex',
          vote_count: 5,
          is_winner: true,
        },
        {
          participant_id: 'p2',
          display_name: 'Sam',
          vote_count: 3,
          is_winner: false,
        },
      ],
      reactions: [],
    })
  })

  it('parses player stats feed items', () => {
    const item = parseOrgSessionFeedItem({
      kind: 'player_stats',
      occurred_at: '2026-07-12T19:00:00.000Z',
      event_id: 'event-1',
      event_short_id: 'abc123',
      event_label: 'Saturday pickup',
      participant_id: 'p3',
      display_name: 'Jordan',
      goals: 2,
      assists: 1,
      reactions: [{ emoji: '🔥', count: 2, reacted_by_me: true }],
    })

    expect(item).toMatchObject({
      kind: 'player_stats',
      display_name: 'Jordan',
      goals: 2,
      assists: 1,
      reactions: [{ emoji: '🔥', count: 2, reacted_by_me: true }],
    })
  })
})

describe('parseOrgSessionFeed', () => {
  it('filters invalid entries', () => {
    const items = parseOrgSessionFeed([
      { kind: 'mvp', occurred_at: 'bad' },
      {
        kind: 'player_stats',
        occurred_at: '2026-07-12T19:00:00.000Z',
        event_id: 'event-1',
        event_short_id: 'abc123',
        event_label: 'Saturday pickup',
        participant_id: 'p3',
        display_name: 'Jordan',
        goals: 1,
        assists: 0,
        reactions: [],
      },
    ])

    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('player_stats')
  })
})

describe('formatPlayerStatsInline', () => {
  it('formats goals and assists compactly', () => {
    expect(formatPlayerStatsInline(4, 2)).toBe('4G · 2A')
    expect(formatPlayerStatsInline(0, 0)).toBeNull()
  })
})

describe('formatFeedItemDate', () => {
  it('returns a short weekday date', () => {
    expect(formatFeedItemDate('2026-07-12T18:00:00.000Z')).toMatch(/Jul/)
  })
})

describe('formatMvpFeedHeadline', () => {
  const base = {
    kind: 'mvp' as const,
    occurred_at: '2026-07-12T18:00:00.000Z',
    event_id: 'event-1',
    event_short_id: 'abc123',
    event_label: 'Saturday pickup',
    total_votes: 0,
    nominees: [],
    reactions: [],
  }

  it('handles no winners', () => {
    expect(
      formatMvpFeedHeadline({
        ...base,
        winners: [],
      }),
    ).toBe('No MVP for Saturday pickup')
  })

  it('handles a single winner', () => {
    expect(
      formatMvpFeedHeadline({
        ...base,
        winners: [{ participant_id: 'p1', display_name: 'Alex', vote_count: 4 }],
      }),
    ).toBe('Alex is session MVP')
  })

  it('handles tied winners', () => {
    expect(
      formatMvpFeedHeadline({
        ...base,
        winners: [
          { participant_id: 'p1', display_name: 'Alex', vote_count: 3 },
          { participant_id: 'p2', display_name: 'Sam', vote_count: 3 },
        ],
      }),
    ).toBe('Alex and Sam share session MVP')
  })
})

describe('formatPlayerStatsFeedHeadline', () => {
  const base = {
    kind: 'player_stats' as const,
    occurred_at: '2026-07-12T18:00:00.000Z',
    event_id: 'event-1',
    event_short_id: 'abc123',
    event_label: 'Saturday pickup',
    participant_id: 'p1',
    display_name: 'Alex',
    goals: 0,
    assists: 0,
    reactions: [],
  }

  it('formats goals and assists', () => {
    expect(
      formatPlayerStatsFeedHeadline({
        ...base,
        goals: 2,
        assists: 1,
      }),
    ).toBe('Alex — 2 goals, 1 assist')
  })

  it('handles zero stat lines', () => {
    expect(formatPlayerStatsFeedHeadline(base)).toBe('Alex shared their stats')
  })
})
