import { LEADERBOARD_MIN_SESSIONS } from '@/lib/engagement'
import { getPublicOrgPastSessionCount } from '@/lib/public-data'
import { LeaderboardLink } from '../../_components/org-page-shell'

type Props = {
  orgId: string
  accent: string
}

/** Leaderboard nav is non-critical; load after the join/roster shell. */
export async function LeaderboardLinkDeferred({ orgId, accent }: Props) {
  const pastSessions = await getPublicOrgPastSessionCount(orgId)
  const unlocked = pastSessions >= LEADERBOARD_MIN_SESSIONS
  if (!unlocked) return null
  return <LeaderboardLink accent={accent} />
}
