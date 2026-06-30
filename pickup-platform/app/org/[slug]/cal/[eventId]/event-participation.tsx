import { Suspense } from 'react'
import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { canUpdateArrivalStatus, isEventEnded } from '@/lib/events'
import { readableTextColor } from '@/lib/colors'
import { getPublicRoster, getPublicWaitlist, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getSessionInfo } from '@/lib/participant'
import { JoinSectionLazy } from './join-section-lazy'
import { EventRosterWithBadges } from './event-roster-with-badges'
import { RosterListFallback } from './roster-list-fallback'
import { SignedInControlsLazy } from './signed-in-controls-lazy'
import { WaitlistSection } from './waitlist-section'
import { CancelledCallout, isEventCancelled, eventName } from '../../_components/event-ui'
import { formatEventWhenLine } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'

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
  const waitlistEnabled = event.capacity != null

  const [{ participant, mySignup }, roster, waitlist] = await Promise.all([
    getSessionToken().then((token) => getSessionInfo(token, org.id, event.id)),
    isCancelled ? Promise.resolve([]) : getPublicRoster(event.id),
    isCancelled || !waitlistEnabled ? Promise.resolve([]) : getPublicWaitlist(event.id),
  ])

  const headcount = rosterHeadcount(roster)
  const isFull = waitlistEnabled && headcount >= event.capacity!
  const spotsLeft = waitlistEnabled ? Math.max(0, event.capacity! - headcount) : null
  const isWaitlisted = mySignup?.list_status === 'waitlisted'
  const confirmedMySignupId = isWaitlisted ? null : mySignup?.signup_id
  const waitlistMySignupId = isWaitlisted ? mySignup?.signup_id : null

  return (
    <>
      {isCancelled ? <CancelledCallout hasSignup={!!mySignup} /> : null}

      {!isCancelled && !isEnded && !mySignup ? (
        <JoinSectionLazy
          orgSlug={slug}
          orgId={org.id}
          eventId={eventId}
          accent={accent}
          accentText={accentText}
          isFull={isFull}
          waitlistEnabled={waitlistEnabled}
          isOnline={event.location_is_online}
          spotsLeft={spotsLeft}
          participant={participant}
          mySignup={mySignup}
          eventTitle={eventName(event)}
          eventWhen={formatEventWhenLine(event)}
          locationLabel={event.location_label}
          locationMapsUrl={
            event.location_is_online ? null : event.location_maps_url.trim() || null
          }
          returningSignupModalEnabled={orgFeatures(org).returning_signup_modal}
        />
      ) : null}

      {!isCancelled ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {isEnded ? 'Who came' : "Who's coming"} ({headcount})
          </h2>
          <div className="mt-4">
            <Suspense fallback={<RosterListFallback />}>
              <EventRosterWithBadges
                roster={roster}
                org={org}
                event={event}
                isOnline={event.location_is_online}
                mySignupId={confirmedMySignupId}
                canLeave={!isEnded}
                orgSlug={slug}
                eventId={eventId}
                accent={accent}
              />
            </Suspense>
          </div>

          {waitlistEnabled ? (
            <WaitlistSection
              waitlist={waitlist}
              mySignupId={waitlistMySignupId}
              canLeave={!isEnded}
              orgSlug={slug}
              eventId={eventId}
              accent={accent}
            />
          ) : null}

          {mySignup && canUpdateStatus ? (
            <SignedInControlsLazy
              orgSlug={slug}
              eventId={eventId}
              signupId={mySignup.signup_id}
              guestCount={mySignup.guest_count}
              arrivalStatus={mySignup.arrival_status}
              listStatus={mySignup.list_status}
              isOnline={event.location_is_online}
              accent={accent}
            />
          ) : null}
        </section>
      ) : null}
    </>
  )
}
