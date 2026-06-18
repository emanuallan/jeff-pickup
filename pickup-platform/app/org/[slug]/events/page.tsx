import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getUpcomingEventsForOrg, formatEventTime, formatEventDayLabel, isEventInProgress, isEventEnded } from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { buildOrgJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
// import { rootBaseUrl } from '@/lib/og-metadata'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter, LeaderboardLink } from '../_components/org-page-shell'
// import { OrganizrLogo } from '../../../_components/organizr-logo'
import { ShareButton } from '../share-button-lazy'
import { arrowRight } from '@/lib/text-arrows'
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
  eventName,
  isEventCancelled,
  cancelledEventClasses,
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

  const events = await getUpcomingEventsForOrg(org.id, 1)
  const nextEvent = events[0]
  const activity = org.activity || 'group sessions'
  const title = org.name
  const description = nextEvent
    ? `Upcoming ${activity} with ${org.name}. Next up ${formatEventTime(nextEvent)} ${nextEvent.location_is_online ? 'on' : 'at'} ${nextEvent.location_label} — see who's coming and confirm you're in.`
    : `See the schedule of upcoming ${activity} with ${org.name}. Check who's coming and confirm you're in — it only takes a few seconds.`

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

  const next = events[0]
  const rest = events.slice(1)
  const nextCancelled = next ? isEventCancelled(next.status) : false
  const nextLive = next ? isEventInProgress(next) && next.status === 'on' : false
  const nextEnded = next ? isEventEnded(next) : false
  const cancelledClasses = cancelledEventClasses(nextCancelled)

  return (
    <OrgPageShell>
      <JsonLd data={buildOrgJsonLd(org)} />
      <div className="flex justify-end">
        {/* Organizr apex branding — re-enable when ready
        <a
          href={rootBaseUrl()}
          className="-ml-1 inline-flex shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:text-zinc-300"
          aria-label="Organizr home"
        >
          <OrganizrLogo
            size={22}
            wordmarkClassName="text-sm font-semibold tracking-tight text-inherit"
          />
        </a>
        */}
        <ShareButton title={org.name} text={`Join ${org.name} on Organizr`} />
      </div>

      <OrgHeader org={org} title={org.name} subtitle={org.activity} />

      {next ? (
        <>
          <section className="mt-8">
            <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 transition-colors hover:border-zinc-700">
              <Link
                href={`/events/${next.short_id}`}
                className="absolute inset-0 z-0 rounded-3xl"
                aria-label={`${eventName(next)} — ${formatEventDayLabel(next)}`}
              />
              <div className="relative z-10 pointer-events-none">
              <div className="flex items-center justify-between gap-3">
                {nextCancelled ? (
                  <EventTimingBadge event={next} accent={accent} cancelled />
                ) : (
                  <EventTimingBadge
                    event={next}
                    accent={accent}
                    cancelled={false}
                    upcomingLabel="Next session"
                  />
                )}
                <StatusPill status={next.status} accent={accent} live={nextLive} ended={nextEnded} />
              </div>

              <h2 className={`mt-4 text-2xl font-semibold tracking-tight ${cancelledClasses.titleLg}`}>
                {eventName(next)}
              </h2>

              <EventDateTimeRow event={next} cancelled={nextCancelled} />

              <EventLocationRow event={next} nestedInLink className="mt-3 flex gap-2 text-sm text-zinc-400" />

              {next.announcement ? (
                <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                  {next.announcement}
                </p>
              ) : null}

              <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                {nextCancelled ? (
                  <>
                    <span className="text-sm text-red-400">This session was cancelled</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition-transform group-hover:translate-x-0.5">
                      View details {arrowRight}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-zinc-400">
                      <Suspense
                        fallback={
                          <FeaturedEventHeadcountFallback capacity={next.capacity} />
                        }
                      >
                        <FeaturedEventHeadcount
                          eventId={next.id}
                          capacity={next.capacity}
                        />
                      </Suspense>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
                      style={{ color: accent }}
                    >
                      Count me in {arrowRight}
                    </span>
                  </>
                )}
              </div>
              </div>
            </div>
          </section>

          {rest.length > 0 ? (
            <section className="mt-10 border-t border-white/5 pt-8">
              <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-600">
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
