import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
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

  const topCaps = capsRows[0]?.caps ?? 0

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← {org.name}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Leaderboard</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Caps = distinct past sessions played. Streaks = consecutive weeks with at least one session.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Caps
        </h2>

        {capsRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No sessions played yet.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {capsRows.map((row, idx) => {
              const prev = capsRows[idx - 1]
              const rank =
                !prev ? 1 : prev.caps === row.caps
                  ? capsRows.slice(0, idx).filter((r) => r.caps > row.caps).length + 1
                  : idx + 1
              const isTop = row.caps > 0 && row.caps === topCaps

              return (
                <li
                  key={row.participant_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-zinc-500">{rank}.</span> {row.display_name}
                    {isTop ? <span className="ml-1" aria-hidden>🏅</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-300">
                    {row.caps} {row.caps === 1 ? 'cap' : 'caps'}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Weekly streaks
        </h2>

        {streakRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No active streaks this week.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {streakRows.map((row, idx) => {
              const prev = streakRows[idx - 1]
              const rank =
                !prev
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-zinc-500">{rank}.</span> {row.display_name}
                    {isTop ? <span className="ml-1" aria-hidden>🔥</span> : null}
                  </span>
                  <span className="shrink-0 text-right text-xs text-zinc-400">
                    <span className="tabular-nums text-zinc-300">
                      {row.current_streak_weeks}w
                    </span>
                    <span className="text-zinc-600"> · best {row.best_streak_weeks}w</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </main>
  )
}
