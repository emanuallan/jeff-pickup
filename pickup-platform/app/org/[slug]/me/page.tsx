import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantForSession } from '@/lib/participant'
import { getParticipantEngagementStats } from '@/lib/engagement'
import { getSoftParticipantCareerStats } from '@/lib/participant-me-stats'
import { orgFeatures } from '@/lib/org-features'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { ROBOTS_PRIVATE } from '@/lib/seo'
import { resolveMeStatKeys, type MeStatKey } from '@/lib/participant-me'
import { MeProfileForm } from './me-profile-form'
import { MeSignOutButton } from './me-sign-out-button'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return { robots: ROBOTS_PRIVATE }
  }

  return {
    title: `You · ${org.name}`,
    description: `Your stats and profile in ${org.name}.`,
    robots: ROBOTS_PRIVATE,
  }
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: hexToRgba(accent, 0.22),
        background: `linear-gradient(155deg, ${hexToRgba(accent, 0.1)}, rgba(9, 9, 11, 0.55) 70%)`,
      }}
    >
      <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-zinc-50">{value}</p>
    </div>
  )
}

export default async function OrgMePage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org || org.status !== 'active') notFound()

  const token = await getSessionToken()
  if (!token) redirect('/')

  const participant = await getParticipantForSession(token, org.id)
  if (!participant?.participant_id) redirect('/')

  const features = orgFeatures(org)
  const accent = org.branding.accent_color
  const accentSoft = accentOnDark(accent)

  const [engagementMap, career] = await Promise.all([
    getParticipantEngagementStats(org.id, [participant.participant_id]),
    getSoftParticipantCareerStats(token, org.id),
  ])

  const engagement = engagementMap.get(participant.participant_id)
  const caps = engagement?.caps ?? 0
  const totalSessions = engagement?.total_sessions ?? 0
  const currentStreak = engagement?.current_streak_weeks ?? 0
  const bestStreak = engagement?.best_streak_weeks ?? 0

  const values: Record<MeStatKey, number> = {
    caps,
    sessions: totalSessions,
    streak: currentStreak,
    best_streak: bestStreak,
    goals: career?.goals ?? 0,
    assists: career?.assists ?? 0,
    mvp_awards: career?.mvp_awards ?? 0,
  }

  const labels: Record<MeStatKey, string> = {
    caps: 'Caps',
    sessions: 'Sessions',
    streak: 'Streak',
    best_streak: 'Best streak',
    goals: 'Goals',
    assists: 'Assists',
    mvp_awards: 'MVP awards',
  }

  const statKeys = resolveMeStatKeys({
    features,
    caps,
    totalSessions,
  })

  return (
    <div className="space-y-10">
      <section aria-labelledby="me-stats-heading">
        <h2 id="me-stats-heading" className="text-lg font-semibold tracking-tight text-zinc-50">
          Career
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Your history in {org.name}.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statKeys.map((key) => (
            <StatChip key={key} label={labels[key]} value={values[key]} accent={accent} />
          ))}
        </div>
      </section>

      <section aria-labelledby="me-settings-heading">
        <h2 id="me-settings-heading" className="text-lg font-semibold tracking-tight text-zinc-50">
          Profile
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          How you show up in this group. Phone stays tied to your history.
        </p>
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
          <MeProfileForm
            slug={slug}
            accent={accent}
            initial={{
              firstName: participant.first_name,
              lastName: participant.last_name,
              displayName: participant.display_name,
              email: participant.email ?? '',
              phone: participant.phone,
            }}
          />
        </div>
      </section>

      <section aria-labelledby="me-sign-out-heading" className="pb-4">
        <h2 id="me-sign-out-heading" className="sr-only">
          Sign out
        </h2>
        <MeSignOutButton accent={accent} />
        <p className="mt-4 text-center text-xs text-zinc-600" style={{ color: `${accentSoft}99` }}>
          You&apos;ll need your phone number again next time you join.
        </p>
      </section>
    </div>
  )
}
