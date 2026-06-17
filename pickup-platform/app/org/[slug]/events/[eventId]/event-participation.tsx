import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { canUpdateArrivalStatus, isEventStarted } from '@/lib/events'
import { readableTextColor } from '@/lib/colors'
import { getPublicRoster, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getSessionInfo } from '@/lib/participant'
import {
  getParticipantEngagementStats,
  isLeaderboardUnlocked,
  isOrgInauguralSession,
} from '@/lib/engagement'
import { buildRosterBadgeMap } from '@/lib/badges'
import {
  JoinSection,
  RosterList,
  ArrivalStatusPicker,
  GuestCountEditor,
} from './join-section'
import { LeaderboardLink } from '../../_components/org-page-shell'
import { CancelledCallout, isEventCancelled } from '../../_components/event-ui'

type Props = {
  slug: string
  eventId: string
  org: Org
  event: EventWithLocation
}

export async function EventParticipation({ slug, eventId, org, event }: Props) {
  const isCancelled = isEventCancelled(event.status)
  const isStarted = isEventStarted(event)
  const canUpdateStatus = canUpdateArrivalStatus(event)
  const accent = org.branding.accent_color
  const accentText = readableTextColor(accent)

  const [roster, leaderboardUnlocked, isInauguralSession, token] = await Promise.all([
    getPublicRoster(event.id),
    isLeaderboardUnlocked(org.id),
    isOrgInauguralSession(org.id, event.id),
    getSessionToken(),
  ])

  const headcount = rosterHeadcount(roster)
  const participantIds = roster.map((e) => e.participant_id)

  const [engagementStats, { participant, mySignup }] = await Promise.all([
    getParticipantEngagementStats(org.id, participantIds),
    getSessionInfo(token, org.id, event.id),
  ])

  const badgesByParticipantId = buildRosterBadgeMap(roster, engagementStats, {
    capsLeaderUnlocked: leaderboardUnlocked,
    newBadgeUnlocked: !isInauguralSession,
  })
  const isFull = event.capacity != null && headcount >= event.capacity
  const spotsLeft = event.capacity != null ? Math.max(0, event.capacity - headcount) : null

  return (
    <>
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
            isPast={isStarted}
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
            canLeave={!isStarted}
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

      {leaderboardUnlocked ? <LeaderboardLink /> : null}
    </>
  )
}
