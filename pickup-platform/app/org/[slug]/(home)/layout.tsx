import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { pickFeaturedUpcomingEvent } from '@/lib/events'
import { getOrgForMember } from '@/lib/orgs'
import { ORG_PUBLIC_NAV_BASE } from '@/lib/org-public-nav'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { resolveOrgPublicNavItems } from '@/lib/org-public-nav.server'
import {
  buildEventShareText,
  buildEventShareTitle,
  buildOrgCalendarShareText,
  buildOrgCalendarShareTitle,
} from '@/lib/public-share-text'
import { OrgHeader } from '../_components/org-header'
import { SocialLinks } from '../_components/social-links'
import { BackToOrganizrLink } from '../_components/back-to-organizr-link'
import { OrgHomeShell } from './_components/org-home-shell'
import { OrgHomeBottomNav } from './_components/org-home-bottom-nav'
import { OrgHomeShareButton } from './_components/org-home-share-button'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function OrgHomeLayout({ children, params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [events, membership, leaderboardUnlocked] = await Promise.all([
    getPublicUpcomingEventsForOrg(org.id, 20, true),
    getOrgForMember(slug),
    isLeaderboardUnlocked(org.id),
  ])
  const featured = pickFeaturedUpcomingEvent(events)
  const accent = org.branding.accent_color
  const navItems = resolveOrgPublicNavItems({ org, leaderboardUnlocked }, ORG_PUBLIC_NAV_BASE)
  const socialLinks = org.branding.links
  const calendarShare = {
    title: buildOrgCalendarShareTitle(org.name, featured),
    text: buildOrgCalendarShareText(org.name, featured),
    imagePath: '/cal/share-image',
  }
  const eventShares = events.map((event) => ({
    shortId: event.short_id,
    title: buildEventShareTitle(org.name, event),
    text: buildEventShareText(org.name, event),
  }))
  const defaultEventShortId = featured?.short_id ?? events[0]?.short_id ?? null
  const isOrganizer = !!membership

  return (
    <OrgHomeShell
      footerOnly={navItems.length <= 1}
      isOrganizer={isOrganizer}
      bottomChrome={
        <Suspense fallback={null}>
          <OrgHomeBottomNav
            items={navItems}
            accent={accent}
            basePath={ORG_PUBLIC_NAV_BASE}
            slug={slug}
            isOrganizer={isOrganizer}
          />
        </Suspense>
      }
    >
      <nav
        className={`flex min-h-9 items-center gap-3 ${slug === 'demo' ? 'justify-between' : 'justify-end'}`}
      >
        {slug === 'demo' ? <BackToOrganizrLink /> : null}
        <Suspense
          fallback={
            <span
              className="inline-flex h-[34px] w-[76px] shrink-0 rounded-full border border-zinc-800 bg-zinc-900/60"
              aria-hidden
            />
          }
        >
          <OrgHomeShareButton
            accent={accent}
            calendar={calendarShare}
            events={eventShares}
            defaultEventShortId={defaultEventShortId}
          />
        </Suspense>
      </nav>

      <OrgHeader
        org={org}
        title={org.name}
        subtitle={org.description}
        logoPriority
        className="mt-2"
      />

      {socialLinks.length > 0 ? (
        <div className="mt-4">
          <SocialLinks links={socialLinks} />
        </div>
      ) : null}

      <div className={`flex-1 ${socialLinks.length > 0 ? 'mt-5' : 'mt-6'}`}>{children}</div>
    </OrgHomeShell>
  )
}
