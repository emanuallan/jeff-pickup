import { t, type Lang } from '../../../lib/i18n'
import { useCapsLeaderboardQuery } from '../queries'

export function CapsLeaderboard(props: { lang: Lang; myNameKey: string }) {
  const q = useCapsLeaderboardQuery()
  const rows = q.data ?? []
  const loading = q.isLoading && !q.data

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{t(props.lang, 'capsLeaderboardTitle')}</div>

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-[var(--muted)]">{t(props.lang, 'loading')}</div>
        ) : q.isError ? (
          <div className="text-sm text-[var(--muted)]">{t(props.lang, 'couldNotLoad')}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">{t(props.lang, 'capsLeaderboardEmpty')}</div>
        ) : (
          <ol className="max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {rows.map((row, idx) => {
              const isMe = Boolean(props.myNameKey) && row.nameKey === props.myNameKey
              return (
                <li
                  key={row.nameKey}
                  className={
                    isMe
                      ? 'flex items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/55 bg-gradient-to-r from-[var(--gold)]/18 via-white/5 to-emerald-400/10 px-3 py-2 shadow-[0_0_0_1px_rgba(210,163,74,0.2)]'
                      : 'flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2'
                  }
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="w-6 shrink-0 text-xs font-semibold text-[var(--muted)]">{idx + 1}</span>
                    <span className="min-w-0 truncate text-sm font-medium">{row.displayName}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-[var(--gold)]">{row.caps}</span>
                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {row.caps === 1 ? t(props.lang, 'capShort') : t(props.lang, 'capsShort')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
