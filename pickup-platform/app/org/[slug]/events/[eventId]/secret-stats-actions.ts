'use server'

import { getOrgBySlug } from '@/lib/orgs'
import { getEventByRef } from '@/lib/events'
import { getEventSecretStats } from '@/lib/event-stats'
import { getSessionToken } from '@/lib/participant-session'
import { lookupParticipantId } from '@/lib/record-page-view'
import type { EventSecretStats } from '@/lib/event-stats'

export async function fetchEventSecretStats(
  orgSlug: string,
  eventRef: string,
): Promise<EventSecretStats | { error: string }> {
  const org = await getOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Group not found.' }
  }

  const event = await getEventByRef(eventRef, org.id)
  if (!event) {
    return { error: 'Session not found.' }
  }

  const token = await getSessionToken()
  const participantId = token ? await lookupParticipantId(org.id, token) : null

  return getEventSecretStats(org.id, event.schedule_id, participantId)
}
