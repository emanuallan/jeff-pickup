import { orgFeatures, type OrgSettings } from '@/lib/org-features'

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
  total_votes: number
  winners: OrgSessionFeedMvpWinner[]
  nominees: OrgSessionFeedMvpNominee[]
}

export type OrgSessionFeedPlayerStatsItem = {
  kind: 'player_stats'
  occurred_at: string
  event_id: string
  event_short_id: string
  event_label: string
  participant_id: string
  display_name: string
  goals: number
  assists: number
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

  if (value.kind === 'mvp') {
    const totalVotes = Number(value.total_votes)
    if (!Number.isFinite(totalVotes)) return null

    return {
      kind: 'mvp',
      occurred_at: value.occurred_at,
      event_id: value.event_id,
      event_short_id: value.event_short_id,
      event_label: value.event_label,
      total_votes: totalVotes,
      winners: parseMvpWinners(value.winners),
      nominees: parseMvpNominees(value.nominees),
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
      participant_id: value.participant_id,
      display_name: typeof value.display_name === 'string' ? value.display_name : 'Player',
      goals,
      assists,
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
