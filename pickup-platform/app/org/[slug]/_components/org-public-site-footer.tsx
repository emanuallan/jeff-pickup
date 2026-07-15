import type { PublicSponsor } from '@/lib/sponsorship'
import { OrgSponsorSection } from './org-sponsor-footer'
import { ScrollingFeedUpdateBar } from './scrolling-feed-update-bar'

type Props = {
  slug: string
  orgName: string
  accent: string
  orgLogoUrl?: string | null
  feedEnabled?: boolean
  sponsors?: PublicSponsor[]
  showSponsorshipCta?: boolean
  showPoweredBy?: boolean
  /** When false, powered-by stays desktop-only because mobile uses sticky chrome. */
  showPoweredByOnMobile?: boolean
}

/** Bottom-of-page public org chrome: sponsor recognition + optional powered-by / ticker strip. */
export function OrgPublicSiteFooter({
  slug,
  orgName,
  accent,
  orgLogoUrl = null,
  feedEnabled = false,
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
        <div className={poweredByVisibility}>
          <ScrollingFeedUpdateBar
            slug={slug}
            accent={accent}
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            feedEnabled={feedEnabled}
            sponsors={sponsors}
          />
        </div>
      ) : null}
    </footer>
  )
}
