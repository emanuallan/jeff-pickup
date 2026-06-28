import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import {
  formatEventTime,
  pickFeaturedUpcomingEvent,
  isEventCancelled,
} from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import {
  buildOrgCalendarShareText,
  buildOrgCalendarShareTitle,
} from '@/lib/public-share-text'
import { buildOrgJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { OrgHeader } from '../_components/org-header'
import { BackToOrganizrLink } from '../_components/back-to-organizr-link'
import { PageHelpHint } from '../_components/page-help-hint'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import { ShareButton } from '../share-button-lazy'
import { accentOnDark } from '@/lib/colors'
import { orgFeatures } from '@/lib/org-features'
import { MoreSessions } from './more-sessions'
import {
  FeaturedEventHeadcount,
  FeaturedEventHeadcountFallback,
} from './[eventId]/event-headcount'
import { LeaderboardLinkDeferred } from './[eventId]/leaderboard-link-deferred'
import {
  FeaturedSessionRow,
  SessionRow,
  CancelledSessionNotice,
} from '../_components/event-ui'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return {}
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
  const nextEvent = pickFeaturedUpcomingEvent(events)
  const groupDescription = org.description || 'group sessions'
  const title = org.name
  const description = nextEvent
    ? `Upcoming ${groupDescription} with ${org.name}. Next up ${formatEventTime(nextEvent)} ${nextEvent.location_is_online ? 'on' : 'at'} ${nextEvent.location_label} — see who's coming and confirm you're in.`
    : `See the schedule of upcoming ${groupDescription} with ${org.name}. Check who's coming and confirm you're in — it only takes a few seconds.`

  return buildOrgMetadata({
    slug,
    path: '/cal',
    imagePath: '/cal/og-image',
    title,
    description,
    siteName: org.name,
  })
}

export default async function EventsPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
  const accent = org.branding.accent_color

  const activeUpcoming = events.filter((ev) => !isEventCancelled(ev.status))
  if (activeUpcoming.length === 1) {
    redirect(`/cal/${activeUpcoming[0].short_id}`)
  }

  const skippedCancelled =
    events[0] && isEventCancelled(events[0].status) ? events[0] : null
  const featured = pickFeaturedUpcomingEvent(events)
  const rest = events.filter(
    (ev) => ev.id !== featured?.id && ev.id !== skippedCancelled?.id,
  )

  return (
    <OrgPageShell>
      <JsonLd data={buildOrgJsonLd(org)} />
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
        eyebrow="Calendar"
        title={org.name}
        subtitle={org.description}
        logoPriority
      />

      {events.length > 0 ? (
        <>
          <div className="mt-8 mb-3">
            <PageHelpHint message="Tap a session to open it and join the roster." />
          </div>

          {featured ? (
            <section>
              <h3
                className="mb-3 px-1 text-xs font-medium uppercase tracking-wide"
                style={{ color: accentOnDark(accent) }}
              >
                Next session
              </h3>
              <FeaturedSessionRow
                event={featured}
                accent={accent}
                footer={
                  <Suspense
                    fallback={
                      <FeaturedEventHeadcountFallback capacity={featured.capacity} />
                    }
                  >
                    <FeaturedEventHeadcount
                      eventId={featured.id}
                      capacity={featured.capacity}
                    />
                  </Suspense>
                }
              />
            </section>
          ) : null}

          {skippedCancelled ? (
            <CancelledSessionNotice
              href={`/cal/${skippedCancelled.short_id}`}
              className={featured ? 'mt-2' : 'mt-8'}
            />
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-10 border-t border-white/5 pt-8">
              <h3
                className="px-1 text-xs font-medium uppercase tracking-wide"
                style={{ color: accentOnDark(accent) }}
              >
                Upcoming sessions
              </h3>
              <MoreSessions count={rest.length}>
                <ul className="space-y-2">
                  {rest.map((ev) => (
                    <li key={ev.id}>
                      <SessionRow event={ev} accent={accent} />
                    </li>
                  ))}
                </ul>
              </MoreSessions>
            </section>
          ) : null}
        </>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No upcoming sessions scheduled yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Check back soon.</p>
        </section>
      )}

      <OrgPageFooter
        slug={org.slug}
        links={org.branding.links}
        accent={accent}
        leaderboardSlot={
          <Suspense fallback={null}>
            <LeaderboardLinkDeferred
              orgId={org.id}
              accent={accent}
              enabled={orgFeatures(org).leaderboard}
            />
          </Suspense>
        }
      />
    </OrgPageShell>
  )
}
