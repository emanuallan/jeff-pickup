import type { ReactNode } from 'react'
import { t, type Lang } from '../../../lib/i18n'

const EMOJI_CHOICES = [
  '⚽️',
  '🥅',
  '👟',
  '🔥',
  '💪',
  '😤',
  '🧤',
  '⭐️',
  '🎯',
  '🏃',
  '🦁',
  '🦅',
  '🧃',
  '☀️',
  '🌧️',
]

export function EmojiPickerModal(props: {
  lang: Lang
  open: boolean
  value: string
  saving?: boolean
  onChange: (next: string) => void
  onClose: () => void
  onSave: () => void | Promise<void>
}): ReactNode {
  if (!props.open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-(--border) bg-[#0b0b0e] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold">{t(props.lang, 'pickEmoji')}</div>
          <button
            type="button"
            className="rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            onClick={props.onClose}
          >
            {t(props.lang, 'close')}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={props.value === e}
              className={
                props.value === e
                  ? 'rounded-2xl border border-(--gold)/35 bg-(--gold)/10 px-2 py-3 text-xl shadow-[0_0_0_1px_rgba(255,255,255,0.10)] ring-1 ring-white/15'
                  : 'rounded-2xl border border-(--border) bg-black/20 px-2 py-3 text-xl hover:bg-white/10'
              }
              onClick={() => props.onChange(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-2xl border border-(--border) bg-black/20 px-4 py-3 text-sm font-semibold hover:bg-white/10"
            onClick={() => props.onChange('')}
          >
            {t(props.lang, 'removeEmoji')}
          </button>
          <button
            type="button"
            disabled={Boolean(props.saving)}
            className="rounded-2xl bg-(--gold) px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-(--gold-2) disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80"
            onClick={props.onSave}
          >
            {t(props.lang, 'saveEmoji')}
          </button>
        </div>
      </div>
    </div>
  )
}

