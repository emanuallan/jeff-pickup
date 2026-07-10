import type { PublicSponsor } from '@/lib/sponsorship'
import { OrgPublicPoweredByStrip } from './org-public-powered-by-strip'
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
  const showSponsorSection = showSponsorshipCta || sponsors.length > 0

  return (
    <footer className={showSponsorSection ? 'mt-8 space-y-5' : 'mt-8'}>
      {showSponsorSection ? (
        <OrgSponsorFooter slug={slug} sponsors={sponsors} showCta={showSponsorshipCta} />
      ) : null}
      <div className="hidden px-1 md:block">
        <OrgPublicPoweredByStrip slug={slug} />
      </div>
    </footer>
  )
}
