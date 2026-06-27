import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import {
  formatEventTime,
  pickFeaturedUpcomingEvent,
  formatEventDayLabel,
  isEventInProgress,
  isEventEnded,
} from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { buildOrgJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { OrgHeader } from '../_components/org-header'
import { BackToOrganizrLink } from '../_components/back-to-organizr-link'
import { PageHelpHint } from '../_components/page-help-hint'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import { ShareButton } from '../share-button-lazy'
import { arrowRight } from '@/lib/text-arrows'
import { accentOnDark } from '@/lib/colors'
import { MoreSessions } from './more-sessions'
import {
  FeaturedEventHeadcount,
  FeaturedEventHeadcountFallback,
} from './[eventId]/event-headcount'
import { LeaderboardLinkDeferred } from './[eventId]/leaderboard-link-deferred'
import {
  StatusPill,
  SessionRow,
  EventDateTimeRow,
  EventLocationRow,
  EventTimingBadge,
  CancelledSessionNotice,
  eventName,
  isEventCancelled,
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
    path: '/events',
    imagePath: '/events/og-image',
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
    redirect(`/events/${activeUpcoming[0].short_id}`)
  }

  const skippedCancelled =
    events[0] && isEventCancelled(events[0].status) ? events[0] : null
  const featured = pickFeaturedUpcomingEvent(events)
  const rest = events.filter(
    (ev) => ev.id !== featured?.id && ev.id !== skippedCancelled?.id,
  )
  const featuredLive = featured ? isEventInProgress(featured) && featured.status === 'on' : false
  const featuredEnded = featured ? isEventEnded(featured) : false

  return (
    <OrgPageShell>
      <JsonLd data={buildOrgJsonLd(org)} />
      <nav
        className={`flex min-h-9 items-center gap-3 ${slug === 'demo' ? 'justify-between' : 'justify-end'}`}
      >
        {slug === 'demo' ? <BackToOrganizrLink /> : null}
        <ShareButton title={org.name} text={`Join ${org.name} on Organizr`} />
      </nav>

      <OrgHeader
        org={org}
        eyebrow="Home"
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
              <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 transition-colors hover:border-zinc-700">
                <Link
                  href={`/events/${featured.short_id}`}
                  className="absolute inset-0 z-0 rounded-3xl"
                  aria-label={`${eventName(featured)} — ${formatEventDayLabel(featured)}`}
                />
                <div className="relative z-10 pointer-events-none">
                  <div className="flex items-center justify-between gap-3">
                    <EventTimingBadge
                      event={featured}
                      accent={accent}
                      cancelled={false}
                      upcomingLabel="Next session"
                    />
                    <StatusPill
                      status={featured.status}
                      accent={accent}
                      live={featuredLive}
                      ended={featuredEnded}
                    />
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">
                    {eventName(featured)}
                  </h2>

                  <EventDateTimeRow event={featured} cancelled={false} />

                  <EventLocationRow
                    event={featured}
                    nestedInLink
                    className="mt-3 flex gap-2 text-sm text-zinc-400"
                  />

                  {featured.announcement ? (
                    <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                      {featured.announcement}
                    </p>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                    <span className="text-sm text-zinc-400">
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
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
                      style={{ color: accentOnDark(accent) }}
                    >
                      View session {arrowRight}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {skippedCancelled ? (
            <CancelledSessionNotice
              href={`/events/${skippedCancelled.short_id}`}
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
              enabled={org.settings.features.leaderboard}
            />
          </Suspense>
        }
      />
    </OrgPageShell>
  )
}
