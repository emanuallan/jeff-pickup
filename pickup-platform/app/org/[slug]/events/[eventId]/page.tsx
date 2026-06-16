import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/orgs'
import {
  getEventById,
  formatEventTime,
  formatEventHappening,
} from '@/lib/events'
import { readableTextColor } from '@/lib/colors'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getSessionInfo } from '@/lib/participant'
import { getParticipantEngagementStats, isLeaderboardUnlocked, isOrgInauguralSession } from '@/lib/engagement'
import { buildRosterBadgeMap } from '@/lib/badges'
import { JoinSection, RosterList, ArrivalStatusPicker, GuestCountEditor } from './join-section'
import { WeatherPill } from './weather-pill'
import { ShareButton } from '../../share-button'
import { OrgHeader } from '../../_components/org-header'
import { OrgPageShell, OrgPageFooter, LeaderboardLink } from '../../_components/org-page-shell'
import { SocialLinks } from '../../_components/social-links'
import {
  StatusPill,
  PinIcon,
  OnlineIcon,
  LiveDot,
  EventDateTimeRow,
  CancelledCallout,
  eventName,
  isEventCancelled,
  cancelledEventClasses,
} from '../../_components/event-ui'

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

  const isCancelled = isEventCancelled(event.status)
  const cancelledClasses = cancelledEventClasses(isCancelled)

  const [roster, leaderboardUnlocked, isInauguralSession, token] = await Promise.all([
    getPublicRoster(eventId),
    isLeaderboardUnlocked(org.id),
    isOrgInauguralSession(org.id, eventId),
    getSessionToken(),
  ])

  const headcount = rosterHeadcount(roster)
  const participantIds = roster.map((e) => e.participant_id)

  const [engagementStats, { participant, mySignup }] = await Promise.all([
    getParticipantEngagementStats(org.id, participantIds),
    getSessionInfo(token, org.id, eventId),
  ])

  const badgesByParticipantId = buildRosterBadgeMap(roster, engagementStats, {
    capsLeaderUnlocked: leaderboardUnlocked,
    newBadgeUnlocked: !isInauguralSession,
  })
  const isPast = new Date(event.starts_at) < new Date()
  const isFull = event.capacity != null && headcount >= event.capacity
  const shareText = `${org.name}: ${formatEventTime(event)} ${event.location_is_online ? 'on' : 'at'} ${event.location_label}. Join us!`
  const accent = org.branding.accent_color
  const accentText = readableTextColor(accent)
  const fallbackName = org.activity || 'Session'
  const spotsLeft = event.capacity != null ? Math.max(0, event.capacity - headcount) : null

  return (
    <OrgPageShell>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> All sessions
        </Link>
        <ShareButton title={org.name} text={shareText} />
      </div>

      <OrgHeader org={org} title={org.name} subtitle={org.activity} className="mt-4" />

      <section className="mt-8">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            {isCancelled ? (
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Not happening
              </span>
            ) : !isPast ? (
              <span className="flex items-center gap-2">
                <LiveDot accent={accent} />
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

          <h2 className={`mt-4 text-2xl font-semibold tracking-tight ${cancelledClasses.titleLg}`}>
            {eventName(event, fallbackName)}
          </h2>

          <EventDateTimeRow event={event} cancelled={isCancelled} />

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
            {event.min_players != null ? (
              <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-400">
                min {event.min_players} participants
              </span>
            ) : null}
            <Suspense fallback={null}>
              <WeatherPill
                lat={event.location_lat}
                lon={event.location_lon}
                startsAt={event.starts_at}
              />
            </Suspense>
          </div>

          {event.announcement ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
              {event.announcement}
            </p>
          ) : null}
        </div>
      </section>

      {isCancelled ? (
        <CancelledCallout hasSignup={!!mySignup} />
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
          <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
            <GuestCountEditor
              orgSlug={slug}
              eventId={eventId}
              signupId={mySignup.signup_id}
              currentCount={mySignup.guest_count}
              accent={accent}
            />
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

      {leaderboardUnlocked ? <LeaderboardLink /> : null}
      <SocialLinks links={org.branding.links} />
      <OrgPageFooter slug={org.slug} />
    </OrgPageShell>
  )
}
