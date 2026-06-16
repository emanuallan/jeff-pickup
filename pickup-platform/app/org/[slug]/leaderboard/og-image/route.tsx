import { getOrgBySlug } from '@/lib/orgs'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { renderOrgOgImage } from '@/lib/og-image'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  const [capsRows, streakRows] = org
    ? await Promise.all([getOrgCapsLeaderboard(org.id), getOrgStreakLeaderboard(org.id)])
    : [[], []]

  const topCaps = capsRows[0]
  const topStreak = streakRows[0]

  let headline = 'Leaderboard'
  let subline = 'Caps and weekly streaks'
  if (topCaps) {
    headline = `${topCaps.display_name} · ${topCaps.caps} caps`
    subline = topStreak
      ? `🔥 ${topStreak.display_name} on a ${topStreak.current_streak_weeks}-week streak`
      : 'Most sessions played'
  }

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    headline,
    subline,
    footer: 'See the full leaderboard',
  })
}
