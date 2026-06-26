import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { formatEventTime, pickFeaturedUpcomingEvent } from '@/lib/events'
import { buildOrgMetadata, rootBaseUrl } from '@/lib/og-metadata'
import { buildOrgJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { OrgHeader } from '../_components/org-header'
import { OrgPageShell, OrgPageFooter } from '../_components/org-page-shell'
import { ShareButton } from '../share-button-lazy'
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
  const title = `Schedule · ${org.name}`
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

      <OrgHeader org={org} title="Schedule" subtitle={org.name} logoPriority />

      <p className="mt-3 text-center text-sm text-zinc-500">
        Pick a session to see who&apos;s coming and join in.
      </p>

      {activeUpcoming.length > 0 ? (
        <p className="mt-1 text-center text-xs text-zinc-600">
          {activeUpcoming.length} upcoming {activeUpcoming.length === 1 ? 'session' : 'sessions'}
        </p>
      ) : null}

      {events.length > 0 ? (
        <>
          {featured ? (
            <section className="mt-8">
              <FeaturedSessionRow
                event={featured}
                accent={accent}
                headcount={
                  <Suspense
                    fallback={<FeaturedEventHeadcountFallback capacity={featured.capacity} />}
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
              href={`/events/${skippedCancelled.short_id}`}
              className={featured ? 'mt-2' : 'mt-8'}
            />
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-8 border-t border-white/5 pt-8">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                More sessions
              </h2>
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
            <LeaderboardLinkDeferred orgId={org.id} accent={accent} />
          </Suspense>
        }
      />
    </OrgPageShell>
  )
}
