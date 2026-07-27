import { getPublicOrgBySlug } from '@/lib/public-data'
import {
  getOrgCapsLeaderboard,
  getOrgMvpLeaderboard,
  getOrgStreakLeaderboard,
} from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { renderOrgOgImage } from '@/lib/og-image'
import { ogArrowRight } from '@/lib/text-arrows'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  const showMvp = org ? orgFeatures(org).session_mvp_voting : false
  const [capsRows, streakRows, mvpRows] = org
    ? await Promise.all([
        getOrgCapsLeaderboard(org.id),
        getOrgStreakLeaderboard(org.id),
        showMvp ? getOrgMvpLeaderboard(org.id) : Promise.resolve([]),
      ])
    : [[], [], []]

  const topCaps = capsRows[0]
  const topStreak = streakRows[0]
  const topMvp = mvpRows[0]

  let headline = 'Leaderboard'
  let subline: string | undefined = undefined
  if (topCaps) {
    headline = `${topCaps.display_name} · ${topCaps.caps} caps`
    if (topStreak) {
      subline = `${topStreak.display_name} · ${topStreak.current_streak_weeks}-week streak`
    } else if (topMvp) {
      subline = `${topMvp.display_name} · ${topMvp.mvp_count} MVP${topMvp.mvp_count === 1 ? '' : 's'}`
    } else {
      subline = 'Most sessions attended'
    }
  }

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: 'Leaderboard',
    headline,
    subline,
    cta: `See the rankings ${ogArrowRight}`,
  })
}
