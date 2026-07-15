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
import { groupRulesActive, orgGroupRules } from '@/lib/group-rules'
import { getGroupRulesStatusForJoin } from '@/lib/group-rules.server'
import {
  getParticipantEngagementStats,
  isLeaderboardUnlocked,
  isOrgInauguralSession,
} from '@/lib/engagement'
import { buildRosterBadgeMap, type RosterBadgeInfo } from '@/lib/badges'
import { getActiveSessionMvpBadges } from '@/lib/session-debrief.server'
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
  const groupRules = orgGroupRules(org.settings)
  const groupRulesEnabled = groupRulesActive(features.group_rules, groupRules)

  const sessionToken = await getSessionToken()

  const [{ participant, mySignup }, roster, waitlist, groupRulesStatus] = await Promise.all([
    getSessionInfo(sessionToken, org.id, event.id),
    isCancelled ? Promise.resolve([]) : getPublicRoster(event.id),
    isCancelled || !waitlistEnabled ? Promise.resolve([]) : getPublicWaitlist(event.id),
    groupRulesEnabled
      ? getGroupRulesStatusForJoin(org.id, { sessionToken })
      : Promise.resolve({
          active: false,
          needs_acceptance: false,
        } as Awaited<ReturnType<typeof getGroupRulesStatusForJoin>>),
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
    const [engagementStats, leaderboardUnlocked, isInauguralSession, sessionMvpBadges] =
      await Promise.all([
      getParticipantEngagementStats(org.id, participantIds),
      isLeaderboardUnlocked(org.id),
      isOrgInauguralSession(org.id, event.id),
      getActiveSessionMvpBadges(org.id),
    ])
    badgesByParticipantId = buildRosterBadgeMap(roster, engagementStats, {
      capsLeaderUnlocked: leaderboardUnlocked,
      newBadgeUnlocked: !isInauguralSession,
      sessionMvpBadges: new Map(
        [...sessionMvpBadges.entries()].map(([participantId, info]) => [
          participantId,
          { event_label: info.event_label },
        ]),
      ),
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
      capacity={event.capacity}
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
      groupRulesEnabled={groupRulesEnabled}
      groupRulesText={groupRulesStatus.rules_text ?? groupRules?.text ?? ''}
      groupRulesVersion={groupRulesStatus.rules_version ?? groupRules?.version ?? 0}
      needsGroupRulesAcceptance={groupRulesStatus.needs_acceptance === true}
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
