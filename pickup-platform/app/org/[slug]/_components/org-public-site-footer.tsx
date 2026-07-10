import { getRootDomain } from '@/lib/tenancy/parse-host'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { rootBaseUrl } from '@/lib/og-metadata'
import type { PublicSponsor } from '@/lib/sponsorship'
import { OrgSponsorFooter } from './org-sponsor-footer'

/** Inline site footer at the bottom of public org pages. */
export function OrgPublicSiteFooter({
  slug,
  sponsors = [],
  showSponsorshipCta = false,
}: {
  slug: string
  sponsors?: PublicSponsor[]
  showSponsorshipCta?: boolean
}) {
  return (
    <footer className="mt-16">
      <OrgSponsorFooter slug={slug} sponsors={sponsors} showCta={showSponsorshipCta} />
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-800/70 pt-6 text-xs text-zinc-600">
        <p className="truncate font-medium tracking-wide">
          {slug}.{getRootDomain()}
        </p>
        <a
          href={rootBaseUrl()}
          title="Create your own group on Organizr"
          className="inline-flex shrink-0 items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-400"
        >
          <span>Powered by</span>
          <OrganizrLogo size={14} showWordmark wordmarkClassName="font-medium text-zinc-500" />
        </a>
      </div>
    </footer>
  )
}
