import { useMemo, type ReactNode } from 'react'
import { t, type Lang } from '../../../lib/i18n'
import type { AuraLedgerRow } from '../../../api/auraLedger'

function titleCaseNameKey(nk: string): string {
  const s = nk.trim()
  if (!s) return s
  return s
    .split(/\s+/g)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function fmtDelta(delta: number): string {
  const n = Math.round(delta)
  return `${n >= 0 ? '+' : ''}${n.toLocaleString()}`
}

function describeRow(lang: Lang, row: AuraLedgerRow): string {
  const me = titleCaseNameKey(row.name_key)
  const from = row.from_name_key ? titleCaseNameKey(row.from_name_key) : ''
  const to = row.to_name_key ? titleCaseNameKey(row.to_name_key) : ''

  switch (row.reason) {
    case 'wave_send':
      return t(lang, 'auraLedgerWave').replace('{from}', me).replace('{to}', to || '?')
    case 'meg_send':
      return t(lang, 'auraLedgerMegSend').replace('{from}', me).replace('{to}', to || '?')
    case 'meg_recv':
      return t(lang, 'auraLedgerMegRecv')
        .replace('{from}', from || '?')
        .replace('{to}', me || '?')
    case 'register':
      return t(lang, 'auraLedgerRegister').replace('{name}', me)
    case 'register_undo':
      return t(lang, 'auraLedgerUnregister').replace('{name}', me)
    case 'guest_bonus':
      return t(lang, 'auraLedgerGuestBonus').replace('{name}', me)
    case 'unregister_penalty':
      return t(lang, 'auraLedgerUnregisterPenalty').replace('{name}', me)
    case 'emoji_bonus':
      return t(lang, 'auraLedgerEmojiBonus').replace('{name}', me)
    case 'week_proxy':
      return t(lang, 'auraLedgerWeekProxy').replace('{name}', me)
    default:
      return `${me}: ${row.reason}`
  }
}

export function AuraLedgerCard(props: {
  lang: Lang
  playDate: string
  rows: AuraLedgerRow[]
  loading?: boolean
  error?: boolean
}): ReactNode {
  const items = useMemo(() => {
    return (props.rows ?? []).map((r) => ({
      id: String(r.id),
      at: r.created_at,
      text: describeRow(props.lang, r),
      delta: fmtDelta(r.delta),
      deltaPos: r.delta >= 0,
    }))
  }, [props.lang, props.rows])

  return (
    <section className="rounded-2xl border border-(--border) bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{t(props.lang, 'auraLedgerTitle')}</div>
          <div className="mt-0.5 text-xs text-(--muted)">{props.playDate}</div>
        </div>
        {props.loading ? (
          <div className="shrink-0 rounded-xl border border-(--border) bg-black/20 px-2.5 py-1.5 text-[11px] font-semibold text-white/80">
            {t(props.lang, 'loading')}
          </div>
        ) : null}
      </div>

      {props.error ? (
        <div className="mt-3 rounded-xl border border-red-200/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100">
          {t(props.lang, 'auraLedgerCouldNotLoad')}
        </div>
      ) : null}

      {!props.loading && !props.error && items.length === 0 ? (
        <div className="mt-3 text-sm font-medium text-white/80">{t(props.lang, 'auraLedgerEmpty')}</div>
      ) : null}

      {items.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/90">{it.text}</div>
                <div className="mt-0.5 text-[11px] text-(--muted)">{new Date(it.at).toLocaleTimeString()}</div>
              </div>
              <div
                className={
                  it.deltaPos
                    ? 'shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-100'
                    : 'shrink-0 rounded-xl border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-red-100'
                }
              >
                {it.delta}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

