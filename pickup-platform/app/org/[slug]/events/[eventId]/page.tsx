import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import { getEventById, formatEventTime, statusLabel } from '@/lib/events'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getWeatherForEvent } from '@/lib/weather'
import { createClient } from '@/lib/supabase/server'
import { getParticipantEngagementStats } from '@/lib/engagement'
import { rosterBadges } from '@/lib/badges'
import { JoinSection, RosterList, type RosterBadgeInfo } from './join-section'
import { ShareButton } from '../../share-button'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return {}
  }

  const event = await getEventById(eventId, org.id)
  if (!event || event.status === 'cancelled') {
    return {}
  }

  const when = formatEventTime(event)
  const title = `${when} · ${org.name}`
  const activity = org.activity || 'a session'
  const where = event.location_label ? ` at ${event.location_label}` : ''
  const description = `Join ${org.name} for ${activity} on ${when}${where}. See who's coming and confirm you're in — it only takes a few seconds.`

  return buildOrgMetadata({
    slug,
    path: `/events/${eventId}`,
    imagePath: `/events/${eventId}/og-image`,
    title,
    description,
    siteName: org.name,
  })
}

export default async function EventPage({ params }: Props) {
  const { slug, eventId } = await params
  const org = await getOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  const event = await getEventById(eventId, org.id)
  if (!event || event.status === 'cancelled') {
    notFound()
  }

  const roster = await getPublicRoster(eventId)
  const headcount = rosterHeadcount(roster)
  const participantIds = roster.map((e) => e.participant_id)
  const engagementStats = await getParticipantEngagementStats(org.id, participantIds)
  const topSessionsOnRoster = Math.max(
    0,
    ...roster.map((e) => engagementStats.get(e.participant_id)?.total_sessions ?? 0),
  )
  const badgesByParticipantId = Object.fromEntries(
    roster.map((e) => {
      const stats = engagementStats.get(e.participant_id)
      const badges = rosterBadges({ stats, topSessionsOnRoster })
      return [e.participant_id, badges satisfies RosterBadgeInfo]
    }),
  )
  const isPast = new Date(event.starts_at) < new Date()
  const isFull = event.capacity != null && headcount >= event.capacity
  const weather = await getWeatherForEvent(
    event.location_lat,
    event.location_lon,
    event.starts_at,
  )
  const shareText = `${org.name}: ${formatEventTime(event)} at ${event.location_label}. Join us!`

  const token = await getSessionToken()
  let participant = null
  let mySignup = null

  if (token) {
    const supabase = await createClient()
    const { data: p } = await supabase.rpc('get_participant_for_session', {
      p_session_token: token,
      p_org_id: org.id,
    })
    if (p) participant = p as typeof participant

    const { data: s } = await supabase.rpc('get_signup_for_session', {
      p_event_id: eventId,
      p_session_token: token,
    })
    if (s) mySignup = s as typeof mySignup
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link href="/events" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← {org.name}
      </Link>

      <header className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{formatEventTime(event)}</h1>
          <ShareButton title={org.name} text={shareText} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {event.location_maps_url ? (
            <a
              href={event.location_maps_url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200"
            >
              {event.location_label} ↗
            </a>
          ) : (
            event.location_label
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>{statusLabel(event.status)}</span>
          <span>
            {headcount}
            {event.capacity != null ? ` / ${event.capacity}` : ''} coming
          </span>
          <span>min {event.min_players}</span>
          {weather ? (
            <span>
              {weather.emoji}
              {weather.tempF != null ? ` ${weather.tempF}°F` : ''}
            </span>
          ) : null}
        </div>
        {event.announcement ? (
          <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">
            {event.announcement}
          </p>
        ) : null}
      </header>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Join
        </h2>
        <div className="mt-4">
          <JoinSection
            orgSlug={slug}
            orgId={org.id}
            eventId={eventId}
            isPast={isPast}
            isFull={isFull}
            participant={participant}
            mySignup={mySignup}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Who&apos;s coming ({headcount})
        </h2>
        <div className="mt-4">
          <RosterList entries={roster} badgesByParticipantId={badgesByParticipantId} />
        </div>
      </section>
    </main>
  )
}
