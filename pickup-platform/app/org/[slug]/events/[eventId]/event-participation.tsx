import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { canUpdateArrivalStatus, formatEventHappening, formatEventTime, formatEventWhenLine, isEventEnded, isEventInProgress, eventDisplayName } from '@/lib/events'
import { readableTextColor } from '@/lib/colors'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getSessionInfo } from '@/lib/participant'
import { JoinSectionLazy } from './join-section-lazy'
import { EventRosterWithBadges } from './event-roster-with-badges'
import { RosterListFallback } from './roster-list-fallback'
import { SignedInControlsLazy } from './signed-in-controls-lazy'
import { CancelledCallout, isEventCancelled } from '../../_components/event-ui'
import { PostRsvpSharePrompt } from './post-rsvp-share-prompt'
import { ReturningJoinExperience } from './returning-join-experience'

type Props = {
  slug: string
  eventId: string
  org: Org
  event: EventWithLocation
}

export async function EventParticipation({ slug, eventId, org, event }: Props) {
  const isCancelled = isEventCancelled(event.status)
  const isEnded = isEventEnded(event)
  const canUpdateStatus = canUpdateArrivalStatus(event)
  const accent = org.branding.accent_color
  const accentText = readableTextColor(accent)

  const [roster, { participant, mySignup }] = await Promise.all([
    getPublicRoster(event.id),
    getSessionToken().then((token) => getSessionInfo(token, org.id, event.id)),
  ])

  const headcount = rosterHeadcount(roster)
  const isFull = event.capacity != null && headcount >= event.capacity
  const spotsLeft = event.capacity != null ? Math.max(0, event.capacity - headcount) : null
  const shareText = `${org.name}: ${formatEventTime(event)} ${event.location_is_online ? 'on' : 'at'} ${event.location_label}. Join us!`
  const isLive = isEventInProgress(event) && event.status === 'on'
  const timingLabel = isLive
    ? 'Happening now'
    : `Happening ${formatEventHappening(event)}`

  return (
    <>
      {isCancelled ? <CancelledCallout hasSignup={!!mySignup} /> : null}

      {!isCancelled && !mySignup ? (
        participant && !isEnded && !isFull ? (
          <ReturningJoinExperience
            orgSlug={slug}
            orgId={org.id}
            eventId={eventId}
            orgName={org.name}
            participantName={participant.display_name}
            accent={accent}
            accentText={accentText}
            eventTitle={eventDisplayName(event.title)}
            timingLabel={timingLabel}
            isLive={isLive}
            whenLine={formatEventWhenLine(event)}
            locationLabel={event.location_label}
            locationIsOnline={event.location_is_online}
            headcount={headcount}
            capacity={event.capacity}
            spotsLeft={spotsLeft}
            announcement={event.announcement || null}
          />
        ) : (
          <JoinSectionLazy
            orgSlug={slug}
            orgId={org.id}
            eventId={eventId}
            accent={accent}
            accentText={accentText}
            isPast={isEnded}
            isFull={isFull}
            isOnline={event.location_is_online}
            spotsLeft={spotsLeft}
            participant={null}
            mySignup={mySignup}
          />
        )
      ) : null}

      {mySignup && !isCancelled && !isEnded ? (
        <PostRsvpSharePrompt
          eventId={eventId}
          title={org.name}
          text={shareText}
          accent={accent}
          accentText={accentText}
        />
      ) : null}

      {mySignup ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Who&apos;s coming ({headcount})
        </h2>
        <div className="mt-4">
          <Suspense fallback={<RosterListFallback />}>
            <EventRosterWithBadges
              roster={roster}
              org={org}
              event={event}
              isOnline={event.location_is_online}
              mySignupId={mySignup?.signup_id}
              canLeave={!isEnded}
              orgSlug={slug}
              eventId={eventId}
              accent={accent}
            />
          </Suspense>
        </div>

        {mySignup && canUpdateStatus && !isCancelled ? (
          <SignedInControlsLazy
            orgSlug={slug}
            eventId={eventId}
            signupId={mySignup.signup_id}
            guestCount={mySignup.guest_count}
            arrivalStatus={mySignup.arrival_status}
            isOnline={event.location_is_online}
            accent={accent}
          />
        ) : null}
        </section>
      ) : null}
    </>
  )
}
