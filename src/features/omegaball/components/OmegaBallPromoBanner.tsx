import { t, type Lang } from '../../../lib/i18n'

const NEW_SITE_URL = 'https://jeff.organizr.co'

export function OmegaBallPromoBanner(props: { lang: Lang }) {
  return (
    <a
      href={NEW_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-(--gold)/45 bg-linear-to-r from-(--gold)/12 via-black/35 to-black/25 px-4 py-3 text-left shadow-[0_0_0_1px_rgba(210,163,74,0.12)] transition hover:border-(--gold)/65 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug text-white">
          {t(props.lang, 'omegaBallPromoBannerTitle')}
        </span>
        <span className="mt-1 block text-xs leading-snug text-white/80">
          {t(props.lang, 'omegaBallPromoBannerBody')}
        </span>
      </span>
      <span className="shrink-0 text-lg leading-none text-(--gold)" aria-hidden>
        →
      </span>
    </a>
  )
}
