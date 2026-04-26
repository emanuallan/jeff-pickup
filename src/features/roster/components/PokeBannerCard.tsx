import type { ReactNode } from 'react'
import { t, type Lang } from '../../../lib/i18n'

export function PokeBannerCard(props: {
  lang: Lang
  kind: 'poke' | 'wave'
  from: string
  megValue?: number | null
  onDismiss: () => void
}): ReactNode {
  const auraLine =
    props.kind === 'poke' && typeof props.megValue === 'number' && Number.isFinite(props.megValue)
      ? ` · -${Math.round(props.megValue).toLocaleString()} aura`
      : ''
  return (
    <section
      className={
        props.kind === 'wave'
          ? 'rounded-2xl border border-cyan-400/55 bg-cyan-500/10 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.28),0_0_28px_rgba(34,211,238,0.4)]'
          : 'rounded-2xl border border-fuchsia-400/55 bg-fuchsia-500/10 p-4 shadow-[0_0_0_1px_rgba(244,114,182,0.22),0_0_28px_rgba(244,114,182,0.35)]'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={
            props.kind === 'wave'
              ? 'min-w-0 text-sm font-semibold text-cyan-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]'
              : 'min-w-0 text-sm font-semibold text-fuchsia-100 drop-shadow-[0_0_10px_rgba(244,114,182,0.55)]'
          }
        >
          {props.kind === 'wave'
            ? t(props.lang, 'waveReceived').replace('{name}', props.from)
            : t(props.lang, 'pokeReceived').replace('{name}', props.from)}
          {auraLine ? <span className="font-bold">{auraLine}</span> : null}
        </div>
        <button
          type="button"
          className={
            props.kind === 'wave'
              ? 'shrink-0 rounded-xl border border-cyan-400/40 bg-black/25 px-3 py-2 text-xs font-medium text-cyan-50 hover:bg-cyan-500/15'
              : 'shrink-0 rounded-xl border border-fuchsia-400/35 bg-black/25 px-3 py-2 text-xs font-medium text-fuchsia-50 hover:bg-fuchsia-500/10'
          }
          onClick={props.onDismiss}
        >
          {props.kind === 'wave' ? t(props.lang, 'waveDismiss') : t(props.lang, 'pokeDismiss')}
        </button>
      </div>
    </section>
  )
}

