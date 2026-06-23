import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { canUpdateArrivalStatus, isEventEnded } from '@/lib/events'
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
import { EventParticipationInteractiveLazy } from './event-participation-interactive-lazy'
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
  const isEnded = isEventEnded(event)
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
      {isCancelled ? <CancelledCallout hasSignup={!!mySignup} /> : null}

      <EventParticipationInteractiveLazy
        slug={slug}
        eventId={eventId}
        org={org}
        event={event}
        isCancelled={isCancelled}
        isEnded={isEnded}
        canUpdateStatus={canUpdateStatus}
        accent={accent}
        accentText={accentText}
        roster={roster}
        headcount={headcount}
        badgesByParticipantId={badgesByParticipantId}
        isFull={isFull}
        spotsLeft={spotsLeft}
        participant={participant}
        mySignup={mySignup}
      />

      {leaderboardUnlocked ? <LeaderboardLink accent={accent} /> : null}
    </>
  )
}
