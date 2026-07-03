import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg } from '@/lib/public-data'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { isEventCancelled, pickFeaturedUpcomingEvent } from '@/lib/events'
import { buildEventJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { MatchdayPanel } from './_components/matchday-panel'
import { LeaderboardPanel } from './_components/leaderboard-panel'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; ev?: string }>
}

export default async function HiddenPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { tab, ev } = await searchParams
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  if (tab === 'leaderboard') {
    if (!orgFeatures(org).leaderboard) {
      notFound()
    }

    const [capsRows, streakRows] = await Promise.all([
      getOrgCapsLeaderboard(org.id),
      getOrgStreakLeaderboard(org.id),
    ])

    return <LeaderboardPanel org={org} capsRows={capsRows} streakRows={streakRows} />
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
  const futureEvents = events.filter((event) => !isEventCancelled(event.status))
  const defaultEvent = pickFeaturedUpcomingEvent(events) ?? futureEvents[0] ?? null

  if (!defaultEvent) {
    return (
      <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">No upcoming sessions scheduled yet.</p>
        <p className="mt-1 text-xs text-zinc-600">Check back soon.</p>
      </section>
    )
  }

  const selectedEvent =
    ev != null && ev !== ''
      ? (futureEvents.find((event) => event.short_id === ev) ?? defaultEvent)
      : defaultEvent

  return (
    <>
      <JsonLd data={buildEventJsonLd(org, selectedEvent, `/cal/${selectedEvent.short_id}`)} />
      <MatchdayPanel
        slug={slug}
        org={org}
        event={selectedEvent}
        eventId={selectedEvent.short_id}
        upcomingEvents={events}
      />
    </>
  )
}
