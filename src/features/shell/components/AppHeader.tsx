import type { Lang } from '../../../lib/i18n'

export function AppHeader(props: { lang: Lang; onLangChange: (lang: Lang) => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/logo.JPG"
          alt="Jeff Pickup Soccer"
          className="h-14 w-14 rounded-2xl border border-(--border) bg-(--surface) object-cover shadow-sm"
        />
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight">Jeff Pickup</div>
          <div className="text-sm text-[--muted] leading-tight">
            Jeffersonville Pick up Soccer
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <div className="inline-flex rounded-2xl border border-(--border) bg-black/20 p-1 text-xs">
          <button
            type="button"
            onClick={() => props.onLangChange('en')}
            className={`rounded-xl px-3 py-2 font-semibold ${
              props.lang === 'en'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/5'
            }`}
            aria-pressed={props.lang === 'en'}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => props.onLangChange('es')}
            className={`rounded-xl px-3 py-2 font-semibold ${
              props.lang === 'es'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/5'
            }`}
            aria-pressed={props.lang === 'es'}
          >
            ES
          </button>
        </div>
      </div>
    </header>
  )
}

