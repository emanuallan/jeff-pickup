import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { pickFeaturedUpcomingEvent } from '@/lib/events'
import { getOrgForMember } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
import { isOrgSessionFeedEnabled } from '@/lib/org-session-feed'
import { getPublicSponsors } from '@/lib/sponsorship.server'
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
import { LinksButton } from '../links-button'
import { OrgHomeShell } from './_components/org-home-shell'
import { OrgHomeBottomNav, OrgHomeDesktopNav } from './_components/org-home-bottom-nav'
import { OrgHomeShareButton } from './_components/org-home-share-button'
import { ParticipantNotificationBellSlot } from '../_components/participant-notification-bell-slot'
import { ParticipantFeedbackDeepLinkSlot } from '../_components/participant-feedback-deep-link-slot'

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

  const [events, membership, leaderboardUnlocked, sponsors] = await Promise.all([
    getPublicUpcomingEventsForOrg(org.id, 20, true),
    getOrgForMember(slug),
    isLeaderboardUnlocked(org.id),
    orgFeatures(org).group_sponsorships ? getPublicSponsors(org.id) : Promise.resolve([]),
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
  const showSponsorshipCta = orgFeatures(org).group_sponsorships
  const feedEnabled = isOrgSessionFeedEnabled(org)
  const orgLogoUrl = org.branding.logo_url

  const showSiteFooter = slug !== 'demo'

  return (
    <OrgHomeShell
      slug={slug}
      orgName={org.name}
      accent={accent}
      orgLogoUrl={orgLogoUrl}
      feedEnabled={feedEnabled}
      footerOnly={navItems.length <= 1}
      isOrganizer={isOrganizer}
      showSiteFooter={showSiteFooter}
      sponsors={sponsors}
      showSponsorshipCta={showSponsorshipCta}
      bottomChrome={
        <Suspense fallback={null}>
          <OrgHomeBottomNav
            items={navItems}
            accent={accent}
            basePath={ORG_PUBLIC_NAV_BASE}
            slug={slug}
            orgName={org.name}
            orgLogoUrl={orgLogoUrl}
            feedEnabled={feedEnabled}
            sponsors={sponsors}
            isOrganizer={isOrganizer}
          />
        </Suspense>
      }
    >
      <div className="md:hidden">
        <nav className="flex min-h-9 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
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
            <Suspense fallback={null}>
              <ParticipantNotificationBellSlot slug={slug} accent={accent} />
            </Suspense>
          </div>
          {socialLinks.length > 0 ? <LinksButton links={socialLinks} /> : null}
        </nav>

        <OrgHeader
          org={org}
          title={org.name}
          subtitle={org.description}
          logoPriority
          className="mt-2"
        />
      </div>

      <div className="hidden md:block">
        <div className="flex items-start justify-between gap-10">
          <OrgHeader
            org={org}
            title={org.name}
            subtitle={org.description}
            logoPriority
            layout="desktop"
            className="min-w-0 flex-1"
          />

          <div className="flex shrink-0 flex-col items-end gap-3 pt-1">
            <nav className="flex items-center gap-2">
              <Suspense fallback={null}>
                <ParticipantNotificationBellSlot slug={slug} accent={accent} />
              </Suspense>
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
              {socialLinks.length > 0 ? <LinksButton links={socialLinks} /> : null}
            </nav>
          </div>
        </div>

        <OrgHomeDesktopNav items={navItems} accent={accent} basePath={ORG_PUBLIC_NAV_BASE} />
      </div>

      <div className="mt-6 md:mt-8">
        <ParticipantFeedbackDeepLinkSlot slug={slug} accent={accent} />
        {children}
      </div>
    </OrgHomeShell>
  )
}
