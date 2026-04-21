import { t, type Lang } from '../../../lib/i18n'

export function SocialLinks(props: { lang: Lang; facebookUrl: string; whatsappUrl: string }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <a
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        href={props.facebookUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t(props.lang, 'facebookGroup')}
      </a>
      <a
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-medium hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        href={props.whatsappUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t(props.lang, 'whatsappGroup')}
      </a>
    </section>
  )
}

