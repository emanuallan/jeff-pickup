/** Per-session team count bounds (events.team_count). */
export const MIN_SESSION_TEAM_COUNT = 2
export const MAX_SESSION_TEAM_COUNT = 8

/** 1-based team index, or null when unassigned. */
export type SessionTeamNumber = number
export type SessionTeamOrUnassigned = SessionTeamNumber | null
/** Explicit team index or balance-preferring random. */
export type SessionTeamChoice = SessionTeamNumber | 'random'

export function sessionTeamLabel(team: SessionTeamOrUnassigned): string {
  if (team != null && team >= 1) return `Team ${team}`
  return 'Unassigned'
}

export function sessionTeamOptions(teamCount: number): SessionTeamNumber[] {
  const n = Math.max(0, Math.floor(teamCount))
  return Array.from({ length: n }, (_, i) => i + 1)
}

/**
 * Prefer the smaller team(s) by headcount; uniform pick among ties.
 * `headcounts` is 0-based for teams 1..N (length === team count).
 */
export function pickBalancedTeam(
  headcounts: ReadonlyArray<number>,
  random: () => number = Math.random,
): SessionTeamNumber {
  if (headcounts.length === 0) {
    throw new Error('pickBalancedTeam requires at least one team')
  }
  let min = headcounts[0]!
  for (let i = 1; i < headcounts.length; i++) {
    const n = headcounts[i]!
    if (n < min) min = n
  }
  const candidates: SessionTeamNumber[] = []
  for (let i = 0; i < headcounts.length; i++) {
    if (headcounts[i] === min) candidates.push(i + 1)
  }
  const idx = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[idx]!
}

export function teamHeadcount(
  entries: ReadonlyArray<{ guest_count: number }>,
): number {
  return entries.reduce((sum, entry) => sum + 1 + entry.guest_count, 0)
}

/** Headcounts for teams 1..teamCount, excluding the signup being (re)assigned. */
export function teamHeadcountsExcluding(
  entries: ReadonlyArray<{
    id: string
    team?: SessionTeamOrUnassigned
    guest_count: number
  }>,
  teamCount: number,
  excludeSignupId: string,
): number[] {
  const counts = Array.from({ length: teamCount }, () => 0)
  for (const entry of entries) {
    if (entry.id === excludeSignupId) continue
    const team = entry.team
    if (team == null || team < 1 || team > teamCount) continue
    counts[team - 1]! += 1 + entry.guest_count
  }
  return counts
}

export function splitRosterByTeam<T extends { team?: SessionTeamOrUnassigned }>(
  entries: T[],
  teamCount: number,
): { teams: T[][]; unassigned: T[] } {
  const teams: T[][] = Array.from({ length: teamCount }, () => [])
  const unassigned: T[] = []

  for (const entry of entries) {
    const team = entry.team
    if (team != null && team >= 1 && team <= teamCount) {
      teams[team - 1]!.push(entry)
    } else {
      unassigned.push(entry)
    }
  }

  return { teams, unassigned }
}

export function parseSessionTeamCount(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n)) return null
  if (n < MIN_SESSION_TEAM_COUNT || n > MAX_SESSION_TEAM_COUNT) return null
  return n
}

export function isSessionTeamNumber(
  value: unknown,
  teamCount: number,
): value is SessionTeamNumber {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= teamCount
  )
}

export function isSessionTeamChoice(
  value: unknown,
  teamCount?: number,
): value is SessionTeamChoice {
  if (value === 'random') return true
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const n = Number.parseInt(value, 10)
    if (teamCount != null) return isSessionTeamNumber(n, teamCount)
    return n >= 1 && n <= MAX_SESSION_TEAM_COUNT
  }
  if (typeof value === 'number') {
    if (teamCount != null) return isSessionTeamNumber(value, teamCount)
    return Number.isInteger(value) && value >= 1 && value <= MAX_SESSION_TEAM_COUNT
  }
  return false
}

/** Normalize RPC/form choice to number | 'random'. */
export function normalizeTeamChoice(value: SessionTeamChoice | string): SessionTeamChoice {
  if (value === 'random') return 'random'
  if (typeof value === 'number') return value
  return Number.parseInt(String(value), 10)
}

export function sessionTeamsEnabled(
  orgTeamSelection: boolean,
  eventTeamCount: number | null | undefined,
): eventTeamCount is number {
  return orgTeamSelection && eventTeamCount != null && eventTeamCount >= MIN_SESSION_TEAM_COUNT
}
