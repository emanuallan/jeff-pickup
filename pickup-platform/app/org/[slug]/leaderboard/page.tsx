import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { accentOnDark } from '@/lib/colors'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import {
  CapsLeaderboard,
  LeaderboardSummary,
  StreakLeaderboard,
} from '../_components/leaderboard-ui'
import { arrowRight } from '@/lib/text-arrows'

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

  return (
    <OrgPageShell>
      <div className="flex justify-start">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> Home
        </Link>
      </div>

      <OrgHeader org={org} title="Leaderboard" subtitle={org.name} className="mt-4" />

      <LeaderboardSummary
        playerCount={capsRows.length}
        topName={topCaps?.display_name ?? null}
        topCaps={topCaps?.caps ?? 0}
        accent={accent}
      />

      <CapsLeaderboard rows={capsRows} accent={accent} />

      <StreakLeaderboard rows={streakRows} accent={accent} />

      <p className="mt-10 text-center">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-100"
          style={{ borderColor: `${accentOnDark(accent)}33` }}
        >
          View sessions {arrowRight}
        </Link>
      </p>

      <OrgPageFooter slug={org.slug} links={org.branding.links} />
    </OrgPageShell>
  )
}
