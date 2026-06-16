import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { readableTextColor } from '@/lib/colors'
import { buildOrgMetadata } from '@/lib/og-metadata'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  if (!org || org.status !== 'active') {
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

/** Circular rank badge — accent-filled for #1, subtle medal tints for #2/#3. */
function RankBadge({ rank, accent }: { rank: number; accent: string }) {
  if (rank === 1) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
        style={{ backgroundColor: accent, color: readableTextColor(accent) }}
      >
        1
      </span>
    )
  }

  const medal =
    rank === 2
      ? 'bg-zinc-300/15 text-zinc-200'
      : rank === 3
        ? 'bg-amber-600/15 text-amber-300'
        : 'bg-zinc-800/80 text-zinc-400'

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${medal}`}
    >
      {rank}
    </span>
  )
}

export default async function LeaderboardPage({ params }: Props) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [capsRows, streakRows] = await Promise.all([
    getOrgCapsLeaderboard(org.id),
    getOrgStreakLeaderboard(org.id),
  ])

  const accent = org.branding.accent_color
  const topCaps = capsRows[0]?.caps ?? 0

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">
      <div className="flex justify-start">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> All sessions
        </Link>
      </div>

      <header className="mt-4 flex flex-col items-center text-center">
        {org.branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.branding.logo_url}
            alt=""
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold shadow-lg"
            style={{ backgroundColor: accent, color: readableTextColor(accent) }}
          >
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1.5 text-base text-zinc-400">{org.name}</p>
      </header>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Caps</h2>
          <span className="text-xs text-zinc-600">Distinct sessions attended</span>
        </div>

        {capsRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No sessions attended yet.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {capsRows.map((row, idx) => {
              const prev = capsRows[idx - 1]
              const rank = !prev
                ? 1
                : prev.caps === row.caps
                  ? capsRows.slice(0, idx).filter((r) => r.caps > row.caps).length + 1
                  : idx + 1
              const isTop = row.caps > 0 && row.caps === topCaps

              return (
                <li
                  key={row.participant_id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/20 px-3 py-2.5 text-sm"
                >
                  <RankBadge rank={rank} accent={accent} />
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">
                    {row.display_name}
                    {isTop ? <span className="ml-1.5" aria-hidden>🏅</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {row.caps} {row.caps === 1 ? 'cap' : 'caps'}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Weekly streaks
          </h2>
          <span className="text-xs text-zinc-600">Consecutive weeks</span>
        </div>

        {streakRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No active streaks this week.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {streakRows.map((row, idx) => {
              const prev = streakRows[idx - 1]
              const rank = !prev
                ? 1
                : prev.current_streak_weeks === row.current_streak_weeks
                  ? streakRows
                      .slice(0, idx)
                      .filter((r) => r.current_streak_weeks > row.current_streak_weeks).length + 1
                  : idx + 1
              const isTop = idx === 0

              return (
                <li
                  key={row.participant_id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/20 px-3 py-2.5 text-sm"
                >
                  <RankBadge rank={rank} accent={accent} />
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">
                    {row.display_name}
                    {isTop ? <span className="ml-1.5" aria-hidden>🔥</span> : null}
                  </span>
                  <span className="shrink-0 text-right text-xs text-zinc-500">
                    <span className="tabular-nums text-zinc-300">{row.current_streak_weeks}w</span>
                    <span className="text-zinc-600"> · best {row.best_streak_weeks}w</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <p className="mt-10 text-center">
        <Link href="/events" className="text-sm text-zinc-400 hover:text-zinc-200">
          View sessions →
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-zinc-600">
        {org.slug}.{getRootDomain()}
      </p>
    </main>
  )
}
