import { t, type Lang } from '../../../lib/i18n'

async function shareOrCopyUrl(args: { url: string; title: string }): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ url: args.url, title: args.title })
      return true
    }
  } catch {
    // ignore
  }

  try {
    await navigator.clipboard.writeText(args.url)
    return true
  } catch {
    return false
  }
}

export function SocialLinks(props: { lang: Lang; facebookUrl: string; whatsappUrl: string }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <button
        type="button"
        className="rounded-2xl border border-(--border) bg-black/20 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
        onClick={async () => {
          const url = window.location.href
          const ok = await shareOrCopyUrl({ url, title: 'Jeff Pickup' })
          if (!ok) window.alert(t(props.lang, 'couldNotCopy'))
          else window.alert(t(props.lang, 'linkCopied'))
        }}
      >
        {t(props.lang, 'shareLink')}
      </button>
    </section>
  )
}

