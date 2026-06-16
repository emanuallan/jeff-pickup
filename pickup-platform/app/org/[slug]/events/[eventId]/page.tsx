import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import {
  getEventById,
  formatEventTime,
  formatEventDayLabel,
  formatEventTimeOnly,
  formatEventHappening,
} from '@/lib/events'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { readableTextColor } from '@/lib/colors'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getWeatherForEvent } from '@/lib/weather'
import { createClient } from '@/lib/supabase/server'
import { getParticipantEngagementStats, isLeaderboardUnlocked } from '@/lib/engagement'
import { rosterBadges } from '@/lib/badges'
import {
  JoinSection,
  RosterList,
  ArrivalStatusPicker,
  type RosterBadgeInfo,
  type MySignup,
} from './join-section'
import { ShareButton } from '../../share-button'
import { StatusPill, PinIcon, OnlineIcon, eventName } from '../event-ui'

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
  if (!event) {
    return {}
  }

  const when = formatEventTime(event)
  const title = `${when} · ${org.name}`
  const activity = org.activity || 'a session'
  const locationPreposition = event.location_is_online ? 'on' : 'at'
  const where = event.location_label ? ` ${locationPreposition} ${event.location_label}` : ''
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
  if (!event) {
    notFound()
  }
  const isCancelled = event.status === 'cancelled'

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
  const shareText = `${org.name}: ${formatEventTime(event)} ${event.location_is_online ? 'on' : 'at'} ${event.location_label}. Join us!`
  const accent = org.branding.accent_color
  const accentText = readableTextColor(accent)
  const fallbackName = org.activity || 'Session'
  const spotsLeft = event.capacity != null ? Math.max(0, event.capacity - headcount) : null
  const leaderboardUnlocked = await isLeaderboardUnlocked(org.id)

  const token = await getSessionToken()
  let participant = null
  let mySignup: MySignup | null = null

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
    if (s) mySignup = s as MySignup
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> All sessions
        </Link>
        <ShareButton title={org.name} text={shareText} />
      </div>

      <header className="mt-4 flex flex-col items-center text-center">
        {org.branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.branding.logo_url}
            alt=""
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold shadow-lg"
            style={{ backgroundColor: accent, color: accentText }}
          >
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{org.name}</h1>
        {org.activity ? (
          <p className="mt-1.5 text-base text-zinc-400">{org.activity}</p>
        ) : null}
      </header>

      <section className="mt-8">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            {!isPast && !isCancelled ? (
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: accent }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: accent }}
                >
                  Happening {formatEventHappening(event)}
                </span>
              </span>
            ) : (
              <span />
            )}
            <StatusPill status={event.status} accent={accent} />
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">
            {eventName(event, fallbackName)}
          </h2>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-medium text-zinc-100">{formatEventDayLabel(event)}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-lg text-zinc-300">{formatEventTimeOnly(event)}</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            {event.location_is_online ? <OnlineIcon /> : <PinIcon />}
            {event.location_is_online ? (
              event.location_meeting_url ? (
                <a
                  href={event.location_meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate transition-colors hover:text-zinc-200"
                >
                  {event.location_label} · Join online ↗
                </a>
              ) : (
                <span className="truncate">{event.location_label} · Online</span>
              )
            ) : event.location_maps_url ? (
              <a
                href={event.location_maps_url}
                target="_blank"
                rel="noreferrer"
                className="truncate transition-colors hover:text-zinc-200"
              >
                {event.location_label} ↗
              </a>
            ) : (
              <span className="truncate">{event.location_label}</span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4 text-sm">
            <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300">
              <span className="font-semibold text-zinc-100">{headcount}</span>
              {event.capacity != null ? ` / ${event.capacity}` : ''} coming
            </span>
            <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-400">
              min {event.min_players}
            </span>
            {weather ? (
              <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300">
                {weather.emoji}
                {weather.tempF != null ? ` ${weather.tempF}°F` : ''}
              </span>
            ) : null}
          </div>

          {event.announcement ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
              {event.announcement}
            </p>
          ) : null}
        </div>
      </section>

      {isCancelled ? (
        <section className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
            Session cancelled
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            {mySignup
              ? "This session has been cancelled, so it won't be happening. Keep an eye out for the next one."
              : "This session has been cancelled and is no longer taking sign-ups. Check the other upcoming sessions."}
          </p>
        </section>
      ) : !mySignup ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <JoinSection
            orgSlug={slug}
            orgId={org.id}
            eventId={eventId}
            accent={accent}
            accentText={accentText}
            isPast={isPast}
            isFull={isFull}
            isOnline={event.location_is_online}
            spotsLeft={spotsLeft}
            participant={participant}
            mySignup={mySignup}
          />
        </section>
      ) : null}

      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Who&apos;s coming ({headcount})
        </h2>
        <div className="mt-4">
          <RosterList
            entries={roster}
            badgesByParticipantId={badgesByParticipantId}
            isOnline={event.location_is_online}
            mySignupId={mySignup?.signup_id}
            canLeave={!isPast}
            orgSlug={slug}
            eventId={eventId}
            accent={accent}
          />
        </div>

        {mySignup && !isPast && !isCancelled ? (
          <div className="mt-5 border-t border-zinc-800 pt-5">
            <ArrivalStatusPicker
              orgSlug={slug}
              eventId={eventId}
              signupId={mySignup.signup_id}
              currentStatus={mySignup.arrival_status}
              isOnline={event.location_is_online}
              accent={accent}
            />
          </div>
        ) : null}
      </section>

      {leaderboardUnlocked ? (
        <p className="mt-10 text-center">
          <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-zinc-200">
            View leaderboard →
          </Link>
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-zinc-600">
        {org.slug}.{getRootDomain()}
      </p>
    </main>
  )
}
