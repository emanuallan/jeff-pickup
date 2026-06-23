'use client'

import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import type { RosterEntry } from '@/lib/signups'
import type { Participant, MySignup } from '@/lib/participant'
import type { RosterBadgeInfo } from '@/lib/badges'
import {
  JoinSection,
  RosterList,
  ArrivalStatusPicker,
  GuestCountEditor,
} from './join-section'

type Props = {
  slug: string
  eventId: string
  org: Org
  event: EventWithLocation
  isCancelled: boolean
  isEnded: boolean
  canUpdateStatus: boolean
  accent: string
  accentText: string
  roster: RosterEntry[]
  headcount: number
  badgesByParticipantId: Record<string, RosterBadgeInfo>
  isFull: boolean
  spotsLeft: number | null
  participant: Participant | null
  mySignup: MySignup | null
}

export function EventParticipationInteractive({
  slug,
  eventId,
  org,
  event,
  isCancelled,
  isEnded,
  canUpdateStatus,
  accent,
  accentText,
  roster,
  headcount,
  badgesByParticipantId,
  isFull,
  spotsLeft,
  participant,
  mySignup,
}: Props) {
  return (
    <>
      {!isCancelled && !mySignup ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          <JoinSection
            orgSlug={slug}
            orgId={org.id}
            eventId={eventId}
            accent={accent}
            accentText={accentText}
            isPast={isEnded}
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
            canLeave={!isEnded}
            orgSlug={slug}
            eventId={eventId}
            accent={accent}
          />
        </div>

        {mySignup && canUpdateStatus && !isCancelled ? (
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
    </>
  )
}
