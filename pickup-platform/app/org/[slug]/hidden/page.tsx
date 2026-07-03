import { notFound } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg, getPublicOrgAndEvent } from '@/lib/public-data'
import { getOrgCapsLeaderboard, getOrgStreakLeaderboard } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { isEventCancelled, isEventEnded } from '@/lib/events'
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
  const activeEvents = events.filter((event) => !isEventEnded(event))
  const defaultEvent =
    activeEvents.find((event) => !isEventCancelled(event.status)) ?? activeEvents[0] ?? null

  let chipPrefixEvents: typeof events = []
  let selectedEvent = defaultEvent

  if (ev != null && ev !== '') {
    const activeMatch = activeEvents.find((event) => event.short_id === ev)
    if (activeMatch) {
      selectedEvent = activeMatch
    } else {
      const linked = (await getPublicOrgAndEvent(slug, ev))?.event ?? null
      if (linked?.org_id === org.id) {
        selectedEvent = linked
        if (isEventEnded(linked)) {
          chipPrefixEvents = [linked]
        }
      }
    }
  }

  if (!selectedEvent) {
    return (
      <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">No upcoming sessions scheduled yet.</p>
        <p className="mt-1 text-xs text-zinc-600">Check back soon.</p>
      </section>
    )
  }

  return (
    <>
      <JsonLd data={buildEventJsonLd(org, selectedEvent, `/cal/${selectedEvent.short_id}`)} />
      <MatchdayPanel
        slug={slug}
        org={org}
        event={selectedEvent}
        eventId={selectedEvent.short_id}
        upcomingEvents={events}
        chipPrefixEvents={chipPrefixEvents}
      />
    </>
  )
}
