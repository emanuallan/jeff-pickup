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

/** Show streak fire when current weekly streak is 2+ */
export function hasActiveStreak(currentStreakWeeks: number): boolean {
  return currentStreakWeeks >= 2
}

export function rosterBadges(args: {
  stats: EngagementStats | undefined
  topSessionsOnRoster: number
  /** Gate the "most caps" badge until the org has enough history (like the leaderboard). */
  capsLeaderUnlocked?: boolean
}): { milestone: number | null; isNew: boolean; streak: number; isCapsLeader: boolean } {
  const totalSessions = args.stats?.total_sessions ?? 0
  const streak = args.stats?.current_streak_weeks ?? 0
  const capsLeaderUnlocked = args.capsLeaderUnlocked ?? true

  return {
    milestone: capsMilestone(totalSessions),
    isNew: isNewPlayer(totalSessions),
    streak: hasActiveStreak(streak) ? streak : 0,
    isCapsLeader:
      capsLeaderUnlocked && totalSessions > 0 && totalSessions === args.topSessionsOnRoster,
  }
}

export type RosterBadgeInfo = ReturnType<typeof rosterBadges>

export function buildRosterBadgeMap(
  roster: Array<{ participant_id: string }>,
  engagementStats: Map<string, EngagementStats>,
  options?: { capsLeaderUnlocked?: boolean },
): Record<string, RosterBadgeInfo> {
  const topSessionsOnRoster = Math.max(
    0,
    ...roster.map((e) => engagementStats.get(e.participant_id)?.total_sessions ?? 0),
  )

  return Object.fromEntries(
    roster.map((e) => {
      const stats = engagementStats.get(e.participant_id)
      return [
        e.participant_id,
        rosterBadges({
          stats,
          topSessionsOnRoster,
          capsLeaderUnlocked: options?.capsLeaderUnlocked,
        }),
      ]
    }),
  )
}
