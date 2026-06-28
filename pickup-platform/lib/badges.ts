export type EngagementStats = {
  participant_id: string
  caps: number
  total_sessions: number
  current_streak_weeks: number
  best_streak_weeks: number
}

const MILESTONES = [5, 10, 25, 50] as const

export function capsMilestone(caps: number): number | null {
  return MILESTONES.includes(caps as (typeof MILESTONES)[number]) ? caps : null
}

export function isNewPlayer(totalSessions: number): boolean {
  return totalSessions === 1
}

/** Show streak fire when current weekly streak is 3+ consecutive weeks. */
export function hasActiveStreak(currentStreakWeeks: number): boolean {
  return currentStreakWeeks >= 3
}

export function rosterBadges(args: {
  stats: EngagementStats | undefined
  topCapsOnRoster: number
  /** Gate the "most caps" badge until the org has enough history (like the leaderboard). */
  capsLeaderUnlocked?: boolean
  /** Hide "New" on the org's inaugural session — everyone would qualify. */
  newBadgeUnlocked?: boolean
}): { milestone: number | null; isNew: boolean; streak: number; isCapsLeader: boolean } {
  const caps = args.stats?.caps ?? 0
  const totalSessions = args.stats?.total_sessions ?? 0
  const streak = args.stats?.current_streak_weeks ?? 0
  const capsLeaderUnlocked = args.capsLeaderUnlocked ?? true
  const newBadgeUnlocked = args.newBadgeUnlocked ?? true

  return {
    milestone: capsMilestone(caps),
    isNew: newBadgeUnlocked && isNewPlayer(totalSessions),
    streak: hasActiveStreak(streak) ? streak : 0,
    isCapsLeader:
      capsLeaderUnlocked && caps > 0 && caps === args.topCapsOnRoster,
  }
}

export type RosterBadgeInfo = ReturnType<typeof rosterBadges>

export function buildRosterBadgeMap(
  roster: Array<{ participant_id: string }>,
  engagementStats: Map<string, EngagementStats>,
  options?: { capsLeaderUnlocked?: boolean; newBadgeUnlocked?: boolean },
): Record<string, RosterBadgeInfo> {
  const topCapsOnRoster = Math.max(
    0,
    ...roster.map((e) => engagementStats.get(e.participant_id)?.caps ?? 0),
  )

  return Object.fromEntries(
    roster.map((e) => {
      const stats = engagementStats.get(e.participant_id)
      return [
        e.participant_id,
        rosterBadges({
          stats,
          topCapsOnRoster,
          capsLeaderUnlocked: options?.capsLeaderUnlocked,
          newBadgeUnlocked: options?.newBadgeUnlocked,
        }),
      ]
    }),
  )
}
