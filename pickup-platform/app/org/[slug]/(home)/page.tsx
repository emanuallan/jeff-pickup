import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPublicOrgBySlug, getPublicUpcomingEventsForOrg, getPublicOrgAndEvent } from '@/lib/public-data'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { orgFeatures } from '@/lib/org-features'
import { formatEventTime, isEventCancelled, isEventEnded, pickFeaturedUpcomingEvent } from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import {
  orgHomeCanonicalPath,
  orgPublicEventHref,
  orgPublicTabHref,
  resolveCalEventId,
} from '@/lib/org-public-nav'
import { buildEventJsonLd } from '@/lib/seo'
import { JsonLd } from '@/app/_components/json-ld'
import { MatchdayPanel } from './_components/matchday-panel'
import { LeaderboardPanelSection } from './_components/leaderboard-panel-section'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; cal?: string; ev?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { tab, cal, ev } = await searchParams
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return {}
  }

  const eventRef = resolveCalEventId(cal, ev)
  let previewEvent = null

  if (eventRef) {
    const linked = await getPublicOrgAndEvent(slug, eventRef)
    if (linked?.event && linked.org.id === org.id) {
      previewEvent = linked.event
    }
  }

  if (!previewEvent) {
    const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
    previewEvent = pickFeaturedUpcomingEvent(events)
  }

  const path = orgHomeCanonicalPath({ tab, cal: eventRef })

  if (previewEvent) {
    const when = formatEventTime(previewEvent)
    const title = `${when} · ${org.name}`
    const groupDescription = org.description || 'a session'
    const locationPreposition = previewEvent.location_is_online ? 'on' : 'at'
    const where = previewEvent.location_label
      ? ` ${locationPreposition} ${previewEvent.location_label}`
      : ''
    const description = `Join ${org.name} for ${groupDescription} on ${when}${where}. See who's coming and confirm you're in — it only takes a few seconds.`

    return buildOrgMetadata({
      slug,
      path,
      imagePath: `/cal/${previewEvent.short_id}/og-image`,
      title,
      description,
      siteName: org.name,
    })
  }

  const groupDescription = org.description || 'group sessions'
  return buildOrgMetadata({
    slug,
    path,
    imagePath: '/cal/og-image',
    title: org.name,
    description: `See the schedule of upcoming ${groupDescription} with ${org.name}. Check who's coming and confirm you're in — it only takes a few seconds.`,
    siteName: org.name,
  })
}

export default async function OrgHomePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { tab, cal, ev } = await searchParams
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const eventRef = resolveCalEventId(cal, ev)
  if (ev && !cal) {
    redirect(orgPublicTabHref('/', tab === 'leaderboard' ? 'leaderboard' : 'sessions', eventRef))
  }

  if (tab === 'leaderboard') {
    if (!orgFeatures(org).leaderboard) {
      notFound()
    }

    const leaderboardUnlocked = await isLeaderboardUnlocked(org.id)
    if (!leaderboardUnlocked) {
      redirect(orgPublicTabHref('/', 'sessions', eventRef))
    }

    return <LeaderboardPanelSection org={org} />
  }

  const events = await getPublicUpcomingEventsForOrg(org.id, 20, true)
  const activeEvents = events.filter((event) => !isEventEnded(event))
  const defaultEvent =
    activeEvents.find((event) => !isEventCancelled(event.status)) ?? activeEvents[0] ?? null

  let chipPrefixEvents: typeof events = []
  let selectedEvent = defaultEvent

  if (eventRef) {
    const activeMatch = activeEvents.find((event) => event.short_id === eventRef)
    if (activeMatch) {
      selectedEvent = activeMatch
    } else {
      const linked = (await getPublicOrgAndEvent(slug, eventRef))?.event ?? null
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
      <JsonLd
        data={buildEventJsonLd(org, selectedEvent, orgPublicEventHref(selectedEvent.short_id))}
      />
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
