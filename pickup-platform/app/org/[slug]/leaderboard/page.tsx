import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import { OrgPublicNavDeferred } from '../_components/org-public-nav-deferred'
import { OrgPublicNavFallback } from '../_components/org-public-nav'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  StreakLeaderboard,
} from '../_components/leaderboard-ui'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org || org.status !== 'active' || !orgFeatures(org).leaderboard) {
    return {}
  }

  const capsRows = await getOrgCapsLeaderboard(org.id)
  const top = capsRows[0]
  const title = `Leaderboard · ${org.name}`
  const description = top
    ? `${top.display_name} leads ${org.name} with ${top.caps} ${top.caps === 1 ? 'cap' : 'caps'}. See the full caps ranking and weekly streaks, then join a session to climb.`
    : `See caps and weekly streaks for ${org.name}. Track who shows up most and join a session to climb the leaderboard yourself.`

  return buildOrgMetadata({
    slug,
    path: '/leaderboard',
    imagePath: '/leaderboard/og-image',
    title,
    description,
    siteName: org.name,
  })
}

export default async function LeaderboardPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  if (!orgFeatures(org).leaderboard) {
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
    <OrgPageShell>
      <OrgHeader org={org} title="Leaderboard" subtitle={org.name} className="mt-2" />

      <Suspense fallback={<OrgPublicNavFallback />}>
        <OrgPublicNavDeferred org={org} activeKey="leaderboard" />
      </Suspense>

      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCapsValue}
        leadersCount={leadersCount}
        accent={accent}
      />

      <CapsLeaderboard rows={capsRows} accent={accent} />

      <StreakLeaderboard rows={streakRows} accent={accent} />

      <OrgPageFooter slug={org.slug} links={org.branding.links} />
    </OrgPageShell>
  )
}
