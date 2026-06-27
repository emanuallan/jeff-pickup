import type { Org } from '@/lib/orgs'
import type { EventWithLocation } from '@/lib/events'
import type { RosterEntry } from '@/lib/signups'
import {
  getParticipantEngagementStats,
  isLeaderboardUnlocked,
  isOrgInauguralSession,
} from '@/lib/engagement'
import { buildRosterBadgeMap } from '@/lib/badges'
import { RosterListLazy } from './roster-list-lazy'

type Props = {
  roster: RosterEntry[]
  org: Org
  event: EventWithLocation
  isOnline: boolean
  mySignupId?: string | null
  canLeave?: boolean
  orgSlug: string
  eventId: string
  accent: string
}

/** Engagement RPC + badge map — streamed after the roster shell. */
export async function EventRosterWithBadges({
  roster,
  org,
  event,
  isOnline,
  mySignupId,
  canLeave,
  orgSlug,
  eventId,
  accent,
}: Props) {
  const participantIds = roster.map((e) => e.participant_id)

  if (!org.settings.features.user_badges) {
    return (
      <RosterListLazy
        entries={roster}
        badgesByParticipantId={{}}
        isOnline={isOnline}
        mySignupId={mySignupId}
        canLeave={canLeave}
        orgSlug={orgSlug}
        eventId={eventId}
        accent={accent}
      />
    )
  }

  const [engagementStats, leaderboardUnlocked, isInauguralSession] = await Promise.all([
    getParticipantEngagementStats(org.id, participantIds),
    isLeaderboardUnlocked(org.id),
    isOrgInauguralSession(org.id, event.id),
  ])

  const badgesByParticipantId = buildRosterBadgeMap(roster, engagementStats, {
    capsLeaderUnlocked: leaderboardUnlocked,
    newBadgeUnlocked: !isInauguralSession,
  })

  return (
    <RosterListLazy
      entries={roster}
      badgesByParticipantId={badgesByParticipantId}
      isOnline={isOnline}
      mySignupId={mySignupId}
      canLeave={canLeave}
      orgSlug={orgSlug}
      eventId={eventId}
      accent={accent}
    />
  )
}
