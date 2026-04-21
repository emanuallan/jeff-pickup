import { t, type Lang } from '../../../lib/i18n'

export function SetupNeededBanner(props: { lang: Lang }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{t(props.lang, 'setupNeededTitle')}</div>
      <div className="mt-1 text-sm text-[--muted]">{t(props.lang, 'setupNeededBody')}</div>
    </section>
  )
}

