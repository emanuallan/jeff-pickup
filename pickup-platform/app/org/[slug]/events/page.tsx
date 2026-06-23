import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime, formatEventDayLabel, isEventInProgress, isEventEnded } from '@/lib/events'
import { buildOrgMetadata, rootBaseUrl } from '@/lib/og-metadata'
import { buildOrgJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter, LeaderboardLink } from '../_components/org-page-shell'
import { ShareButton } from '../share-button-lazy'
import { arrowRight } from '@/lib/text-arrows'
import { accentOnDark } from '@/lib/colors'
import { MoreSessions } from './more-sessions'
import {
  FeaturedEventHeadcount,
  FeaturedEventHeadcountFallback,
} from './[eventId]/event-headcount'
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
  const org = await getOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return {}
  }

  const events = await getUpcomingEventsForOrg(org.id, 20, true)
  const nextEvent = events[0]
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
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const [events, leaderboardUnlocked] = await Promise.all([
    getUpcomingEventsForOrg(org.id, 20, true),
    isLeaderboardUnlocked(org.id),
  ])
  const accent = org.branding.accent_color

  const activeUpcoming = events.filter((ev) => !isEventCancelled(ev.status))
  if (activeUpcoming.length === 1) {
    redirect(`/events/${activeUpcoming[0].short_id}`)
  }

  const skippedCancelled =
    events[0] && isEventCancelled(events[0].status) ? events[0] : null
  const featured = skippedCancelled
    ? events.find((ev) => !isEventCancelled(ev.status)) ?? null
    : events[0] ?? null
  const rest = events.filter(
    (ev) => ev.id !== featured?.id && ev.id !== skippedCancelled?.id,
  )
  const featuredLive = featured ? isEventInProgress(featured) && featured.status === 'on' : false
  const featuredEnded = featured ? isEventEnded(featured) : false

  return (
    <OrgPageShell>
      <JsonLd data={buildOrgJsonLd(org)} />
      <div className={`flex items-center ${slug === 'demo' ? 'justify-between' : 'justify-end'}`}>
        {slug === 'demo' ? (
          <a
            href={rootBaseUrl()}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Back to Organizr
          </a>
        ) : null}
        <ShareButton title={org.name} text={`Join ${org.name} on Organizr`} />
      </div>

      <OrgHeader org={org} title={org.name} subtitle={org.description} logoPriority />

      {events.length > 0 ? (
        <>
          {featured ? (
            <section className="mt-8">
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
                      Count me in {arrowRight}
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
                More sessions
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

      {leaderboardUnlocked ? <LeaderboardLink accent={accent} /> : null}
      <OrgPageFooter slug={org.slug} links={org.branding.links} />
    </OrgPageShell>
  )
}
