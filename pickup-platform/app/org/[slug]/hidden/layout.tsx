import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { pickFeaturedUpcomingEvent } from '@/lib/events'
import { HIDDEN_ORG_NAV_BASE } from '@/lib/org-public-nav'
import { resolveOrgPublicNavItems } from '@/lib/org-public-nav.server'
import {
  buildOrgCalendarShareText,
  buildOrgCalendarShareTitle,
} from '@/lib/public-share-text'
import { OrgHeader } from '../_components/org-header'
import { BackToOrganizrLink } from '../_components/back-to-organizr-link'
import { ShareButton } from '../share-button-lazy'
import { HiddenPageShell } from './_components/hidden-page-shell'
import { HiddenBottomNav } from './_components/hidden-bottom-nav'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function HiddenOrgLayout({ children, params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
  const featured = pickFeaturedUpcomingEvent(events)
  const accent = org.branding.accent_color
  const navItems = resolveOrgPublicNavItems({ org }, HIDDEN_ORG_NAV_BASE)

  return (
    <HiddenPageShell
      footerOnly={navItems.length <= 1}
      bottomChrome={
        <Suspense fallback={null}>
          <HiddenBottomNav
            items={navItems}
            accent={accent}
            basePath={HIDDEN_ORG_NAV_BASE}
            slug={slug}
          />
        </Suspense>
      }
    >
      <nav
        className={`flex min-h-9 items-center gap-3 ${slug === 'demo' ? 'justify-between' : 'justify-end'}`}
      >
        {slug === 'demo' ? <BackToOrganizrLink /> : null}
        <ShareButton
          title={buildOrgCalendarShareTitle(org.name, featured)}
          text={buildOrgCalendarShareText(org.name, featured)}
          imagePath="/cal/share-image"
          accent={accent}
        />
      </nav>

      <OrgHeader
        org={org}
        title={org.name}
        subtitle={org.description}
        logoPriority
        className="mt-2"
      />

      <div className="mt-6 flex-1">{children}</div>
    </HiddenPageShell>
  )
}
