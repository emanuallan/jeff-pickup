import { isLeaderboardUnlocked } from '@/lib/engagement'
import { LeaderboardLink } from '../../_components/org-page-shell'

type Props = {
  orgId: string
  accent: string
}

/** Leaderboard nav is non-critical; load after the join/roster shell. */
export async function LeaderboardLinkDeferred({ orgId, accent }: Props) {
  const unlocked = await isLeaderboardUnlocked(orgId)
  if (!unlocked) return null
  return <LeaderboardLink accent={accent} />
}
