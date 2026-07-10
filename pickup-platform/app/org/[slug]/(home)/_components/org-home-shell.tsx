import type { ReactNode } from 'react'
import {
  ORG_PUBLIC_CONTENT_MAX,
  ORG_PUBLIC_DESKTOP_SHELL_PADDING,
} from '@/lib/org-public-layout'
import { OrgPublicBackdrop } from '../../_components/org-public-backdrop'
import { OrgPublicSiteFooter } from '../../_components/org-public-site-footer'
import { OrgDemoSiteFooter } from '../../_components/org-demo-site-footer'
import { OrganizerConsoleToolbarLink } from '../../_components/organizer-console-toolbar-link'
import type { PublicSponsor } from '@/lib/sponsorship'

/** Bottom padding when tab bar + slim footer strip are shown. */
export const ORG_HOME_BOTTOM_CHROME_PADDING =
  'pb-[calc(8rem+env(safe-area-inset-bottom))]'

/** Bottom padding when tab bar + organizer console footer are shown. */
export const ORG_HOME_ORGANIZER_BOTTOM_CHROME_PADDING =
  'pb-[calc(8rem+env(safe-area-inset-bottom))]'

/** Bottom padding when only the powered-by strip is shown (single tab). */
export const ORG_HOME_FOOTER_ONLY_PADDING =
  'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'

/** Bottom padding when only the organizer console footer is shown. */
export const ORG_HOME_ORGANIZER_FOOTER_ONLY_PADDING =
  'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'

export function OrgHomeShell({
  children,
  bottomChrome,
  footerOnly = false,
  isOrganizer = false,
  slug,
  accent,
  showSiteFooter = true,
  sponsors = [],
  showSponsorshipCta = false,
}: {
  children: ReactNode
  bottomChrome: ReactNode
  footerOnly?: boolean
  isOrganizer?: boolean
  slug: string
  accent: string
  /** When false, skip the inline site footer (demo org). */
  showSiteFooter?: boolean
  sponsors?: PublicSponsor[]
  showSponsorshipCta?: boolean
}) {
  const bottomPadding = footerOnly
    ? isOrganizer
      ? ORG_HOME_ORGANIZER_FOOTER_ONLY_PADDING
      : ORG_HOME_FOOTER_ONLY_PADDING
    : isOrganizer
      ? ORG_HOME_ORGANIZER_BOTTOM_CHROME_PADDING
      : ORG_HOME_BOTTOM_CHROME_PADDING

  return (
    <>
      <OrgPublicBackdrop accent={accent} />
      <main
        className={`mx-auto flex min-h-dvh flex-col px-5 pt-6 sm:px-6 sm:pt-8 ${ORG_PUBLIC_CONTENT_MAX} ${bottomPadding} ${ORG_PUBLIC_DESKTOP_SHELL_PADDING}`}
      >
        {children}
        {showSiteFooter ? (
          <OrgPublicSiteFooter
            slug={slug}
            sponsors={sponsors}
            showSponsorshipCta={showSponsorshipCta}
          />
        ) : null}
        {slug === 'demo' ? (
          <div className="hidden md:block">
            <OrgDemoSiteFooter />
          </div>
        ) : null}
      </main>
      {bottomChrome}
      {isOrganizer ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] md:block md:pb-12">
          <div
            className={`pointer-events-none mx-auto px-5 sm:px-6 ${ORG_PUBLIC_CONTENT_MAX}`}
          >
            <OrganizerConsoleToolbarLink
              slug={slug}
              label="Back to console"
              className="pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
