import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getEventByRef, formatEventTime, statusLabel } from '@/lib/events'
import { orgFeatures } from '@/lib/org-features'
import { getParticipantHistoryForOrg } from '@/lib/participants'
import { getRosterWithContact, rosterHeadcount, splitRosterByStatus } from '@/lib/signups'
import {
  ConsolePage,
  ConsoleHeader,
  btnOutline,
} from '../../../../_components/console-ui'
import { RosterEditPanel } from './roster-edit-panel'

type Props = {
  params: Promise<{ orgSlug: string; eventId: string }>
}

export default async function EditSessionRosterPage({ params }: Props) {
  const { orgSlug, eventId } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const event = await getEventByRef(eventId, org.id)
  if (!event) {
    notFound()
  }

  const features = orgFeatures(org)
  const [allRoster, participants] = await Promise.all([
    getRosterWithContact(event.id),
    getParticipantHistoryForOrg(org.id),
  ])
  const { confirmed, waitlisted } = splitRosterByStatus(allRoster)
  const rosterParticipantIds = new Set(allRoster.map((entry) => entry.participant_id))
  const availableParticipants = participants.filter(
    (participant) => !rosterParticipantIds.has(participant.id),
  )

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Edit roster"
        description={`${formatEventTime(event)} · ${event.location_label}`}
        backHref={`/console/${orgSlug}/sessions/${eventId}`}
        backLabel="Session"
        useHistoryBack
        actions={
          <Link href={`/console/${orgSlug}/sessions/${eventId}`} className={btnOutline}>
            View session
          </Link>
        }
      />
      <p className="mt-2 text-xs text-zinc-500">{statusLabel(event.status)}</p>

      <RosterEditPanel
        orgSlug={orgSlug}
        eventRef={eventId}
        guestsEnabled={features.guest_signups}
        waitlistEnabled={event.capacity != null}
        capacity={event.capacity}
        headcount={rosterHeadcount(confirmed)}
        confirmed={confirmed}
        waitlisted={waitlisted}
        availableParticipants={availableParticipants}
      />
    </ConsolePage>
  )
}
