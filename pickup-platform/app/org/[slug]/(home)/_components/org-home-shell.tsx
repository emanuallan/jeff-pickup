import type { ReactNode } from 'react'
import {
  ORG_PUBLIC_CONTENT_MAX,
  ORG_PUBLIC_DESKTOP_SHELL_PADDING,
} from '@/lib/org-public-layout'
import { OrgPublicBackdrop } from '../../_components/org-public-backdrop'
import { OrgPublicSiteFooter } from '../../_components/org-public-site-footer'
import { OrgDemoSiteFooter } from '../../_components/org-demo-site-footer'

/** Bottom padding when tab bar + slim footer strip are shown. */
export const ORG_HOME_BOTTOM_CHROME_PADDING =
  'pb-[calc(8rem+env(safe-area-inset-bottom))]'

/** Bottom padding when tab bar + organizer console footer are shown. */
export const ORG_HOME_ORGANIZER_BOTTOM_CHROME_PADDING =
  'pb-[calc(9rem+env(safe-area-inset-bottom))]'

/** Bottom padding when only the footer strip is shown (single tab). */
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
  showDesktopSiteFooter = true,
}: {
  children: ReactNode
  bottomChrome: ReactNode
  footerOnly?: boolean
  isOrganizer?: boolean
  slug: string
  accent: string
  /** When false, skip the inline site footer (demo and organizer use their own chrome). */
  showDesktopSiteFooter?: boolean
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
        {showDesktopSiteFooter ? (
          <div className="hidden md:block">
            <OrgPublicSiteFooter slug={slug} />
          </div>
        ) : null}
        {slug === 'demo' ? (
          <div className="hidden md:block">
            <OrgDemoSiteFooter />
          </div>
        ) : null}
      </main>
      {bottomChrome}
    </>
  )
}
