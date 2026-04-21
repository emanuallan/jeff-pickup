import { t, type Lang } from '../../../lib/i18n'
import { useCapsLeaderboardQuery, useWeeklyStreakLeaderboardQuery } from '../queries'

export function CapsLeaderboard(props: { lang: Lang; myNameKey: string }) {
  const q = useCapsLeaderboardQuery()
  const rows = q.data ?? []
  const loading = q.isLoading && !q.data
  const streakQ = useWeeklyStreakLeaderboardQuery()
  const streakRows = streakQ.data ?? []
  const streakLoading = streakQ.isLoading && !streakQ.data

  return (
    <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
      <div className="text-sm font-semibold">{t(props.lang, 'capsLeaderboardTitle')}</div>

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-(--muted)">{t(props.lang, 'loading')}</div>
        ) : q.isError ? (
          <div className="text-sm text-(--muted)">{t(props.lang, 'couldNotLoad')}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-(--muted)">{t(props.lang, 'capsLeaderboardEmpty')}</div>
        ) : (
          <ol className="max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {rows.map((row, idx) => {
              const isMe = Boolean(props.myNameKey) && row.nameKey === props.myNameKey
              const topCaps = rows[0]?.caps ?? 0
              const isTopCaps = row.caps > 0 && row.caps === topCaps
              const prev = rows[idx - 1]
              const prevRank = prev ? 1 + rows.slice(0, idx).filter((r) => r.caps > row.caps).length : 1
              const shownRank = !prev ? 1 : prev.caps === row.caps ? prevRank : idx + 1
              return (
                <li
                  key={row.nameKey}
                  className={
                    isMe
                      ? 'flex items-center justify-between gap-3 rounded-xl border border-(--gold)/55 bg-linear-to-r from-(--gold)/18 via-white/5 to-emerald-400/10 px-3 py-2 shadow-[0_0_0_1px_rgba(210,163,74,0.2)]'
                      : 'flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-black/20 px-3 py-2'
                  }
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="w-6 shrink-0 text-xs font-semibold text-(--muted)">{shownRank}</span>
                    <span className="min-w-0 truncate text-sm font-medium">{row.displayName}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-(--gold)">
                      {row.caps}
                      {isTopCaps ? <span className="ml-1" aria-hidden>🏅</span> : null}
                    </span>
                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-(--muted)">
                      {row.caps === 1 ? t(props.lang, 'capShort') : t(props.lang, 'capsShort')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="mt-6 border-t border-(--border) pt-4">
        <div className="text-sm font-semibold">{t(props.lang, 'weeklyStreakLeaderboardTitle')}</div>
        <div className="mt-3">
          {streakLoading ? (
            <div className="text-sm text-(--muted)">{t(props.lang, 'loading')}</div>
          ) : streakQ.isError ? (
            <div className="text-sm text-(--muted)">{t(props.lang, 'couldNotLoad')}</div>
          ) : streakRows.length === 0 ? (
            <div className="text-sm text-(--muted)">{t(props.lang, 'weeklyStreakLeaderboardEmpty')}</div>
          ) : (
            <ol className="max-h-[min(18rem,45dvh)] space-y-2 overflow-y-auto pr-1">
              {streakRows.map((row, idx) => {
                const isMe = Boolean(props.myNameKey) && row.nameKey === props.myNameKey
                const topValue = streakRows[0]?.currentStreakWeeks ?? 0
                const isTopStreak = row.currentStreakWeeks > 0 && row.currentStreakWeeks === topValue
                const prev = streakRows[idx - 1]
                const prevRank = prev
                  ? 1 + streakRows.slice(0, idx).filter((r) => r.currentStreakWeeks > row.currentStreakWeeks).length
                  : 1
                const shownRank =
                  !prev ? 1 : prev.currentStreakWeeks === row.currentStreakWeeks ? prevRank : idx + 1
                return (
                  <li
                    key={row.nameKey}
                    className={
                      isMe
                        ? 'flex items-center justify-between gap-3 rounded-xl border border-(--gold)/55 bg-linear-to-r from-(--gold)/18 via-white/5 to-emerald-400/10 px-3 py-2 shadow-[0_0_0_1px_rgba(210,163,74,0.2)]'
                        : 'flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-black/20 px-3 py-2'
                    }
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="w-6 shrink-0 text-xs font-semibold text-(--muted)">{shownRank}</span>
                      <span className="min-w-0 truncate text-sm font-medium">{row.displayName}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold tabular-nums text-(--gold)">
                        {row.currentStreakWeeks}
                        {isTopStreak ? <span className="ml-1" aria-hidden>🔥</span> : null}
                      </span>
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-(--muted)">
                        {row.currentStreakWeeks === 1 ? t(props.lang, 'weekShort') : t(props.lang, 'weeksShort')}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
