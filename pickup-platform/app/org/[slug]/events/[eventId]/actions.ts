'use server'

import { revalidatePath } from 'next/cache'
import { getOrgBySlug } from '@/lib/orgs'
import { canUpdateArrivalStatus, getEventByRef } from '@/lib/events'
import type { EventWithLocation } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { setSessionToken, getSessionToken } from '@/lib/participant-session'
import type { ArrivalStatus } from '@/lib/arrival-status'
import { normalizePhoneDigits, isValidPhoneDigits } from '@/lib/phone'

async function getOpenEvent(
  orgSlug: string,
  eventRef: string,
): Promise<{ event: EventWithLocation } | { error: string }> {
  const org = await getOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Organization not found.' }
  }

  const event = await getEventByRef(eventRef, org.id)
  if (!event) {
    return { error: 'Session not found.' }
  }

  if (!canUpdateArrivalStatus(event)) {
    return { error: 'This session has ended.' }
  }

  return { event }
}

export async function joinEvent(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const phone = normalizePhoneDigits(String(formData.get('phone') ?? ''))
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const displayName = String(formData.get('display_name') ?? '').trim()
  const guestCount = Number.parseInt(String(formData.get('guest_count') ?? '0'), 10)

  if (!isValidPhoneDigits(phone)) {
    return { error: 'Enter a valid 10-digit phone number.' }
  }

  const open = await getOpenEvent(orgSlug, eventId)
  if ('error' in open) {
    return { error: open.error }
  }

  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: open.event.id,
    p_phone: phone,
    p_first_name: firstName,
    p_last_name: lastName,
    p_display_name: displayName || null,
    p_guest_count: Number.isFinite(guestCount) ? guestCount : 0,
  })

  if (error) {
    return { error: error.message }
  }

  const result = data as { session_token?: string } | null
  if (result?.session_token) {
    await setSessionToken(String(result.session_token))
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}

export async function recoverSession(
  orgSlug: string,
  eventId: string,
  phone: string,
): Promise<{ error?: string }> {
  const org = await getOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Group not found.' }
  }

  const digits = normalizePhoneDigits(phone)
  if (!isValidPhoneDigits(digits)) {
    return { error: 'Enter a valid 10-digit phone number.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recover_participant_session', {
    p_org_id: org.id,
    p_phone: digits,
  })

  if (error) {
    return { error: error.message }
  }

  const result = data as { session_token?: string } | null
  if (result?.session_token) {
    await setSessionToken(String(result.session_token))
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}

export async function quickJoinEvent(
  orgSlug: string,
  eventId: string,
  orgId: string,
  guestCount = 0,
): Promise<{ error?: string }> {
  const token = await getSessionToken()
  if (!token) {
    return { error: 'No saved session' }
  }

  const supabase = await createClient()

  const { data: participant, error: pError } = await supabase.rpc('get_participant_for_session', {
    p_session_token: token,
    p_org_id: orgId,
  })

  if (pError || !participant) {
    return { error: 'Session expired — please sign up again' }
  }

  const p = participant as {
    first_name: string
    last_name: string
    phone: string
    display_name: string
  }

  const guests = Number.isFinite(guestCount) ? Math.max(0, Math.min(20, guestCount)) : 0

  const open = await getOpenEvent(orgSlug, eventId)
  if ('error' in open) {
    return { error: open.error }
  }

  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: open.event.id,
    p_phone: p.phone,
    p_first_name: p.first_name,
    p_last_name: p.last_name,
    p_display_name: p.display_name,
    p_guest_count: guests,
  })

  if (error) {
    return { error: error.message }
  }

  const result = data as { session_token?: string } | null
  if (result?.session_token) {
    await setSessionToken(String(result.session_token))
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}

export async function updateGuestCount(
  orgSlug: string,
  eventId: string,
  signupId: string,
  guestCount: number,
): Promise<{ error?: string }> {
  const token = await getSessionToken()
  if (!token) {
    return { error: 'Not signed in' }
  }

  const open = await getOpenEvent(orgSlug, eventId)
  if ('error' in open) {
    return { error: open.error }
  }

  const guests = Number.isFinite(guestCount) ? Math.max(0, Math.min(20, guestCount)) : 0

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_guest_count', {
    p_signup_id: signupId,
    p_session_token: token,
    p_guest_count: guests,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}

export async function leaveEvent(
  orgSlug: string,
  eventId: string,
  signupId: string,
): Promise<{ error?: string }> {
  const token = await getSessionToken()
  if (!token) {
    return { error: 'Not signed in' }
  }

  const open = await getOpenEvent(orgSlug, eventId)
  if ('error' in open) {
    return { error: open.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('leave_event', {
    p_signup_id: signupId,
    p_session_token: token,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}

export async function updateArrivalStatus(
  orgSlug: string,
  eventId: string,
  signupId: string,
  status: ArrivalStatus,
): Promise<{ error?: string }> {
  const token = await getSessionToken()
  if (!token) {
    return { error: 'Not signed in' }
  }

  const open = await getOpenEvent(orgSlug, eventId)
  if ('error' in open) {
    return { error: open.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_arrival_status', {
    p_signup_id: signupId,
    p_session_token: token,
    p_status: status,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/org/${orgSlug}/events/${eventId}`)
  revalidatePath(`/org/${orgSlug}`)
  return {}
}
