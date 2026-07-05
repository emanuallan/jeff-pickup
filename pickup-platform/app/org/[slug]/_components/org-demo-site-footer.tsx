import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { rootBaseUrl } from '@/lib/og-metadata'
import { arrowLeft } from '@/lib/text-arrows'

/** Demo-only inline footer for tablet/desktop — back link stays out of the header toolbar. */
export function OrgDemoSiteFooter() {
  return (
    <footer className="mt-16 hidden border-t border-indigo-500/30 pt-5 md:block">
      <a
        href={rootBaseUrl()}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
      >
        <span aria-hidden>{arrowLeft}</span>
        Back to Organizr
        <OrganizrLogo
          size={16}
          showWordmark
          wordmarkClassName="font-medium text-indigo-100"
        />
      </a>
    </footer>
  )
}
