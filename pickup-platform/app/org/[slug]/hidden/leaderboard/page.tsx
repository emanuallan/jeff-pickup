import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  StreakLeaderboard,
} from '../../_components/leaderboard-ui'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function HiddenLeaderboardPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active' || !orgFeatures(org).leaderboard) {
    notFound()
  }

  const [capsRows, streakRows] = await Promise.all([
    getOrgCapsLeaderboard(org.id),
    getOrgStreakLeaderboard(org.id),
  ])

  const accent = org.branding.accent_color
  const topCaps = capsRows[0]
  const topCapsValue = topCaps?.caps ?? 0
  const leadersCount = capsRows.filter((row) => row.caps === topCapsValue).length

  return (
    <>
      <h2 className="text-lg font-semibold text-zinc-100">Leaderboard</h2>

      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCapsValue}
        leadersCount={leadersCount}
        accent={accent}
      />

      <CapsLeaderboard rows={capsRows} accent={accent} />

      <StreakLeaderboard rows={streakRows} accent={accent} />
    </>
  )
}
