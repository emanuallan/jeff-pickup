'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getEventByRef } from '@/lib/events'
import { parseRosterAddForm } from '@/lib/console/parse-roster-add-form'
import { clampConsoleGuestCount } from '@/lib/console/guest-count'
import { orgFeatures } from '@/lib/org-features'
import { createClient } from '@/lib/supabase/server'
import { getOrgForMember } from '@/lib/orgs'

type ActionResult = { ok: true } | { error: string }

async function requireSession(orgSlug: string, eventRef: string) {
  const org = await getOrgForMember(orgSlug)
  if (!org) {
    throw new Error('Not authorized')
  }

  const event = await getEventByRef(eventRef, org.id)
  if (!event) {
    return null
  }

  return { org, event }
}

function revalidateSessionRoster(
  orgSlug: string,
  eventRef: string,
  orgId: string,
) {
  revalidatePath(`/console/${orgSlug}/sessions/${eventRef}`)
  revalidatePath(`/console/${orgSlug}/sessions/${eventRef}/edit`)
  revalidatePath(`/console/${orgSlug}/sessions`)
  revalidatePath(`/org/${orgSlug}`)
  revalidateTag(`org-events:${orgId}`)
  revalidateTag(`event:${orgSlug}:${eventRef}`)
}

function rpcErrorMessage(error: { message: string }): string {
  const message = error.message
  if (message.includes('Invalid phone number')) {
    return 'Enter a valid 10-digit phone number.'
  }
  if (message.includes('First and last name are required')) {
    return 'First and last name are required.'
  }
  if (message.includes('Signup is not on the waitlist')) {
    return 'That participant is not on the waitlist.'
  }
  if (message.includes('Not authorized')) {
    return 'You do not have permission to edit this roster.'
  }
  return message
}

export async function addSessionRosterSignup(
  orgSlug: string,
  eventRef: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession(orgSlug, eventRef)
  if (!session) {
    return { error: 'Session not found.' }
  }

  const parsed = parseRosterAddForm(formData, orgFeatures(session.org).guest_signups)
  if ('error' in parsed) {
    return parsed
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('organizer_add_session_signup', {
    p_event_id: session.event.id,
    p_phone: parsed.data.phone,
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_display_name: parsed.data.displayName,
    p_guest_count: parsed.data.guestCount,
    p_list_status: parsed.data.listStatus,
  })

  if (error) {
    return { error: rpcErrorMessage(error) }
  }

  revalidateSessionRoster(orgSlug, eventRef, session.org.id)
  return { ok: true }
}

export async function addExistingSessionRosterSignup(
  orgSlug: string,
  eventRef: string,
  participantId: string,
  guestCount: number,
): Promise<ActionResult> {
  const session = await requireSession(orgSlug, eventRef)
  if (!session) {
    return { error: 'Session not found.' }
  }

  const guests = orgFeatures(session.org).guest_signups ? clampConsoleGuestCount(guestCount) : 0
  const supabase = await createClient()
  const { error } = await supabase.rpc('organizer_add_session_signup_by_participant', {
    p_event_id: session.event.id,
    p_participant_id: participantId,
    p_guest_count: guests,
    p_list_status: null,
  })

  if (error) {
    return { error: rpcErrorMessage(error) }
  }

  revalidateSessionRoster(orgSlug, eventRef, session.org.id)
  return { ok: true }
}

export async function removeSessionRosterSignup(
  orgSlug: string,
  eventRef: string,
  signupId: string,
): Promise<ActionResult> {
  const session = await requireSession(orgSlug, eventRef)
  if (!session) {
    return { error: 'Session not found.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('organizer_remove_session_signup', {
    p_signup_id: signupId,
  })

  if (error) {
    return { error: rpcErrorMessage(error) }
  }

  revalidateSessionRoster(orgSlug, eventRef, session.org.id)
  return { ok: true }
}

export async function promoteSessionWaitlistSignup(
  orgSlug: string,
  eventRef: string,
  signupId: string,
): Promise<ActionResult> {
  const session = await requireSession(orgSlug, eventRef)
  if (!session) {
    return { error: 'Session not found.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('organizer_promote_waitlist_signup', {
    p_signup_id: signupId,
  })

  if (error) {
    return { error: rpcErrorMessage(error) }
  }

  revalidateSessionRoster(orgSlug, eventRef, session.org.id)
  return { ok: true }
}

export async function updateSessionRosterGuestCount(
  orgSlug: string,
  eventRef: string,
  signupId: string,
  guestCount: number,
): Promise<ActionResult> {
  const session = await requireSession(orgSlug, eventRef)
  if (!session) {
    return { error: 'Session not found.' }
  }

  const guests = orgFeatures(session.org).guest_signups ? clampConsoleGuestCount(guestCount) : 0
  const supabase = await createClient()
  const { error } = await supabase.rpc('organizer_update_session_signup_guests', {
    p_signup_id: signupId,
    p_guest_count: guests,
  })

  if (error) {
    return { error: rpcErrorMessage(error) }
  }

  revalidateSessionRoster(orgSlug, eventRef, session.org.id)
  return { ok: true }
}
