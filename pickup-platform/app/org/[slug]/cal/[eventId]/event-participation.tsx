import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import { canUpdateArrivalStatus, isEventEnded } from '@/lib/events'
import { readableTextColor } from '@/lib/colors'
import { getPublicRoster, getPublicWaitlist, rosterHeadcount } from '@/lib/signups'
import { getSessionToken } from '@/lib/participant-session'
import { getSessionInfo } from '@/lib/participant'
import { CancelledCallout, isEventCancelled, eventName } from '../../_components/event-ui'
import { formatEventWhenLine } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'
import {
  getParticipantEngagementStats,
  isLeaderboardUnlocked,
  isOrgInauguralSession,
} from '@/lib/engagement'
import { buildRosterBadgeMap, type RosterBadgeInfo } from '@/lib/badges'
import { ParticipationPanel } from './participation-panel'

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
  const features = orgFeatures(org)

  const [{ participant, mySignup }, roster, waitlist] = await Promise.all([
    getSessionToken().then((token) => getSessionInfo(token, org.id, event.id)),
    isCancelled ? Promise.resolve([]) : getPublicRoster(event.id),
    isCancelled || !waitlistEnabled ? Promise.resolve([]) : getPublicWaitlist(event.id),
  ])

  const headcount = rosterHeadcount(roster)
  const isFull = waitlistEnabled && headcount >= event.capacity!
  const spotsLeft = waitlistEnabled ? Math.max(0, event.capacity! - headcount) : null
  const isWaitlisted = mySignup?.list_status === 'waitlisted'
  const confirmedMySignupId = isWaitlisted ? null : mySignup?.signup_id ?? null
  const waitlistMySignupId = isWaitlisted ? mySignup?.signup_id ?? null : null

  let badgesByParticipantId: Record<string, RosterBadgeInfo> = {}
  if (!isCancelled && features.user_badges) {
    const participantIds = roster.map((e) => e.participant_id)
    const [engagementStats, leaderboardUnlocked, isInauguralSession] = await Promise.all([
      getParticipantEngagementStats(org.id, participantIds),
      isLeaderboardUnlocked(org.id),
      isOrgInauguralSession(org.id, event.id),
    ])
    badgesByParticipantId = buildRosterBadgeMap(roster, engagementStats, {
      capsLeaderUnlocked: leaderboardUnlocked,
      newBadgeUnlocked: !isInauguralSession,
    })
  }

  return (
    <ParticipationPanel
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
      locationMapsUrl={event.location_is_online ? null : event.location_maps_url.trim() || null}
      returningSignupModalEnabled={features.returning_signup_modal}
      publicRosterEnabled={features.public_roster}
      guestsEnabled={features.guest_signups}
      roster={roster}
      waitlist={waitlist}
      headcount={headcount}
      isEnded={isEnded}
      isCancelled={isCancelled}
      confirmedMySignupId={confirmedMySignupId}
      waitlistMySignupId={waitlistMySignupId}
      canUpdateStatus={canUpdateStatus}
      badgesByParticipantId={badgesByParticipantId}
      rosterHeading={isCancelled ? "Who's coming" : isEnded ? 'Who came' : "Who's coming"}
      cancelledCallout={
        isCancelled ? <CancelledCallout hasSignup={!!mySignup} /> : undefined
      }
    />
  )
}
