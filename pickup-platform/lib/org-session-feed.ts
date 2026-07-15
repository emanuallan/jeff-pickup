import { orgFeatures, type OrgSettings } from '@/lib/org-features'

export type OrgSessionFeedReaction = {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export type OrgSessionFeedMvpNominee = {
  participant_id: string
  display_name: string
  vote_count: number
  is_winner: boolean
}

export type OrgSessionFeedMvpWinner = {
  participant_id: string
  display_name: string
  vote_count: number
}

export type OrgSessionFeedMvpItem = {
  kind: 'mvp'
  occurred_at: string
  event_id: string
  event_short_id: string
  event_label: string
  /** Session start instant — preferred for date labels over occurred_at. */
  event_starts_at: string | null
  event_timezone: string | null
  total_votes: number
  winners: OrgSessionFeedMvpWinner[]
  nominees: OrgSessionFeedMvpNominee[]
  reactions: OrgSessionFeedReaction[]
}

export type OrgSessionFeedPlayerStatsItem = {
  kind: 'player_stats'
  occurred_at: string
  event_id: string
  event_short_id: string
  event_label: string
  /** Session start instant — preferred for date labels over occurred_at. */
  event_starts_at: string | null
  event_timezone: string | null
  participant_id: string
  display_name: string
  goals: number
  assists: number
  reactions: OrgSessionFeedReaction[]
}

export type OrgSessionFeedItem = OrgSessionFeedMvpItem | OrgSessionFeedPlayerStatsItem

/** MVP cards only appear when at least one vote was cast (skip cron backfill noise). */
export function shouldIncludeMvpFeedItem(totalVotes: number): boolean {
  return totalVotes > 0
}

export function isOrgSessionFeedEnabled(org: { settings?: OrgSettings | null }): boolean {
  const features = orgFeatures(org)
  return (
    features.session_feedback &&
    (features.session_mvp_voting || features.session_player_stats)
  )
}

function parseFeedReactions(raw: unknown): OrgSessionFeedReaction[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      if (typeof row.emoji !== 'string') return null
      const count = Number(row.count)
      if (!Number.isFinite(count)) return null

      return {
        emoji: row.emoji,
        count,
        reacted_by_me: row.reacted_by_me === true,
      }
    })
    .filter((entry): entry is OrgSessionFeedReaction => entry != null)
}

function parseMvpNominees(raw: unknown): OrgSessionFeedMvpNominee[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      if (typeof row.participant_id !== 'string') return null
      const voteCount = Number(row.vote_count)
      if (!Number.isFinite(voteCount)) return null

      return {
        participant_id: row.participant_id,
        display_name: typeof row.display_name === 'string' ? row.display_name : 'Player',
        vote_count: voteCount,
        is_winner: row.is_winner === true,
      }
    })
    .filter((entry): entry is OrgSessionFeedMvpNominee => entry != null)
}

function parseMvpWinners(raw: unknown): OrgSessionFeedMvpWinner[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as Record<string, unknown>
      if (typeof row.participant_id !== 'string') return null
      const voteCount = Number(row.vote_count)
      if (!Number.isFinite(voteCount)) return null

      return {
        participant_id: row.participant_id,
        display_name: typeof row.display_name === 'string' ? row.display_name : 'Player',
        vote_count: voteCount,
      }
    })
    .filter((entry): entry is OrgSessionFeedMvpWinner => entry != null)
}

export function parseOrgSessionFeedItem(raw: unknown): OrgSessionFeedItem | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  if (typeof value.occurred_at !== 'string') return null
  if (typeof value.event_id !== 'string') return null
  if (typeof value.event_short_id !== 'string') return null
  if (typeof value.event_label !== 'string') return null

  const eventStartsAt =
    typeof value.event_starts_at === 'string' ? value.event_starts_at : null
  const eventTimezone =
    typeof value.event_timezone === 'string' ? value.event_timezone : null

  if (value.kind === 'mvp') {
    const totalVotes = Number(value.total_votes)
    if (!Number.isFinite(totalVotes)) return null

    return {
      kind: 'mvp',
      occurred_at: value.occurred_at,
      event_id: value.event_id,
      event_short_id: value.event_short_id,
      event_label: value.event_label,
      event_starts_at: eventStartsAt,
      event_timezone: eventTimezone,
      total_votes: totalVotes,
      winners: parseMvpWinners(value.winners),
      nominees: parseMvpNominees(value.nominees),
      reactions: parseFeedReactions(value.reactions),
    }
  }

  if (value.kind === 'player_stats') {
    if (typeof value.participant_id !== 'string') return null
    const goals = Number(value.goals)
    const assists = Number(value.assists)
    if (!Number.isInteger(goals) || !Number.isInteger(assists)) return null

    return {
      kind: 'player_stats',
      occurred_at: value.occurred_at,
      event_id: value.event_id,
      event_short_id: value.event_short_id,
      event_label: value.event_label,
      event_starts_at: eventStartsAt,
      event_timezone: eventTimezone,
      participant_id: value.participant_id,
      display_name: typeof value.display_name === 'string' ? value.display_name : 'Player',
      goals,
      assists,
      reactions: parseFeedReactions(value.reactions),
    }
  }

  return null
}

export function parseOrgSessionFeed(raw: unknown): OrgSessionFeedItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => parseOrgSessionFeedItem(entry))
    .filter((entry): entry is OrgSessionFeedItem => entry != null)
}

export function formatMvpFeedHeadline(item: OrgSessionFeedMvpItem): string {
  if (item.winners.length === 0) {
    return `No MVP for ${item.event_label}`
  }

  if (item.winners.length === 1) {
    return `${item.winners[0].display_name} is session MVP`
  }

  const names = item.winners.map((winner) => winner.display_name)
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} share session MVP`
  }

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]} share session MVP`
}

export function formatPlayerStatsFeedHeadline(item: OrgSessionFeedPlayerStatsItem): string {
  const parts: string[] = []
  if (item.goals > 0) {
    parts.push(`${item.goals} goal${item.goals === 1 ? '' : 's'}`)
  }
  if (item.assists > 0) {
    parts.push(`${item.assists} assist${item.assists === 1 ? '' : 's'}`)
  }

  if (parts.length === 0) {
    return `${item.display_name} shared their stats`
  }

  return `${item.display_name} — ${parts.join(', ')}`
}

/** Short calendar label for feed metadata, e.g. "Sun, Jul 12". */
export function formatFeedItemDate(iso: string, timeZone?: string | null): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  })
}

/** Session/event date for ticker and feed metadata (not post/finalized time). */
export function formatFeedSessionDate(item: OrgSessionFeedItem): string {
  if (item.event_starts_at) {
    return formatFeedItemDate(item.event_starts_at, item.event_timezone)
  }
  return item.event_label
}

export function formatPlayerStatsInline(goals: number, assists: number): string | null {
  const parts: string[] = []
  if (goals > 0) parts.push(`${goals}G`)
  if (assists > 0) parts.push(`${assists}A`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function feedItemReactionTarget(item: OrgSessionFeedItem): {
  feedKind: OrgSessionFeedItem['kind']
  eventId: string
  subjectParticipantId: string | null
} {
  return {
    feedKind: item.kind,
    eventId: item.event_id,
    subjectParticipantId: item.kind === 'player_stats' ? item.participant_id : null,
  }
}

export function parseFeedReactionToggleResult(raw: unknown): OrgSessionFeedReaction[] | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  return parseFeedReactions(value.reactions)
}
