import { useMemo } from 'react'
import { t, type Lang } from '../../../lib/i18n'
import type { GameStatus } from '../../../api/settings'

function chipClasses(status: GameStatus) {
  if (status === 'on') return 'border-emerald-200/30 bg-emerald-500/10 text-emerald-100'
  if (status === 'cancelled') return 'border-red-200/30 bg-red-500/10 text-red-100'
  return 'border-amber-200/30 bg-amber-500/10 text-amber-100'
}

export function GameStatusCard(props: {
  lang: Lang
  status: GameStatus
  headcount: number
  minPlayers: number
  onTapTitle?: () => void
}) {
  const effectiveStatus: GameStatus = useMemo(() => {
    if (props.status !== 'tentative') return props.status
    return props.headcount >= props.minPlayers ? 'on' : 'tentative'
  }, [props.headcount, props.minPlayers, props.status])

  const headline = useMemo(() => {
    if (effectiveStatus === 'on') return t(props.lang, 'statusOn')
    if (effectiveStatus === 'cancelled') return t(props.lang, 'statusCancelled')
    return t(props.lang, 'statusTentative')
  }, [effectiveStatus, props.lang])

  const detail = useMemo(() => {
    if (effectiveStatus === 'cancelled') return t(props.lang, 'statusCancelledDetail')
    if (effectiveStatus === 'on') return t(props.lang, 'statusOnDetail')
    const need = Math.max(0, props.minPlayers - props.headcount)
    return need <= 0
      ? t(props.lang, 'statusOnDetail')
      : t(props.lang, 'statusNeedMore').replace('{n}', String(need))
  }, [effectiveStatus, props.headcount, props.lang, props.minPlayers])

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded-md"
            onClick={props.onTapTitle}
          >
            {t(props.lang, 'gameStatus')}
          </button>
          <div className="mt-0.5 text-sm text-[--muted]">{detail}</div>
        </div>
        <div
          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${chipClasses(
            effectiveStatus,
          )}`}
        >
          {headline}
        </div>
      </div>
    </section>
  )
}

