import { t, type Lang } from '../../../lib/i18n'

export function SocialLinks(props: { lang: Lang; facebookUrl: string; whatsappUrl: string }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <a
        className="rounded-2xl border border-[#1877F2] bg-[#062A6F] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#07348A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
        href={props.facebookUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t(props.lang, 'facebookGroup')}
      </a>
      <a
        className="rounded-2xl border border-[#25D366] bg-[#0B3B2E] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#0E4A39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
        href={props.whatsappUrl}
        target="_blank"
        rel="noreferrer"
      >
        {t(props.lang, 'whatsappGroup')}
      </a>
    </section>
  )
}

