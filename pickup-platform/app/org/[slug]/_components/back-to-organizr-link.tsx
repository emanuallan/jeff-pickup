import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { rootBaseUrl } from '@/lib/og-metadata'

/** Demo org chrome — pill back link to the Organizr marketing site. */
export function BackToOrganizrLink() {
  return (
    <a
      href={rootBaseUrl()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-sm transition-colors hover:border-indigo-400/45 hover:bg-indigo-500/15"
      title="Back to Organizr"
    >
      <span aria-hidden className="text-indigo-300">
        ←
      </span>
      <OrganizrLogo
        size={16}
        showWordmark
        wordmarkClassName="text-sm font-medium text-indigo-200"
        className="gap-1.5"
      />
    </a>
  )
}
