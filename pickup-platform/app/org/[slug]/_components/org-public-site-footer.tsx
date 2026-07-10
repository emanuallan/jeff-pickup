import type { PublicSponsor } from '@/lib/sponsorship'
import { OrgPublicPoweredByStrip } from './org-public-powered-by-strip'
import { OrgSponsorSection } from './org-sponsor-footer'

type Props = {
  slug: string
  orgName: string
  accent: string
  sponsors?: PublicSponsor[]
  showSponsorshipCta?: boolean
  showPoweredBy?: boolean
  /** When false, powered-by stays desktop-only because mobile uses sticky chrome. */
  showPoweredByOnMobile?: boolean
}

/** Bottom-of-page public org chrome: sponsor recognition + optional powered-by strip. */
export function OrgPublicSiteFooter({
  slug,
  orgName,
  accent,
  sponsors = [],
  showSponsorshipCta = false,
  showPoweredBy = true,
  showPoweredByOnMobile = false,
}: Props) {
  const showSponsorSection = showSponsorshipCta || sponsors.length > 0
  const poweredByVisibility = showPoweredByOnMobile ? '' : 'hidden md:block'

  return (
    <footer className={showSponsorSection || showPoweredBy ? 'mt-5 space-y-5' : undefined}>
      {showSponsorSection ? (
        <OrgSponsorSection
          slug={slug}
          orgName={orgName}
          accent={accent}
          sponsors={sponsors}
          showCta
        />
      ) : null}
      {showPoweredBy ? (
        <div className={`border-t border-zinc-800/70 pt-5 ${poweredByVisibility}`}>
          <OrgPublicPoweredByStrip slug={slug} />
        </div>
      ) : null}
    </footer>
  )
}
