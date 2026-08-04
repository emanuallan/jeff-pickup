'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionToken, setSessionToken } from '@/lib/participant-session'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { isValidPhoneDigits, normalizePhoneDigits } from '@/lib/phone'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'
import { completeTelegramPair, getOpenPairToken } from '@/lib/telegram/links'

export type PairPageState = {
  status: 'invalid' | 'expired' | 'used' | 'ready' | 'done'
  orgName?: string
  orgSlug?: string
  telegramUsername?: string | null
  displayName?: string | null
  sessionDisplayName?: string | null
  error?: string
}

export async function loadPairPageState(
  orgSlug: string,
  token: string,
): Promise<PairPageState> {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) {
    return { status: 'invalid', error: 'Group not found.' }
  }

  const row = await getOpenPairToken(token)
  if (!row || row.org_id !== org.id) {
    return { status: 'invalid', orgName: org.name, orgSlug: org.slug, error: 'Invalid pairing link.' }
  }

  if (row.used_at) {
    return {
      status: 'used',
      orgName: org.name,
      orgSlug: org.slug,
      error: 'This pairing link was already used.',
    }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return {
      status: 'expired',
      orgName: org.name,
      orgSlug: org.slug,
      error: 'This pairing link expired. Ask the bot for a new /link.',
    }
  }

  let sessionDisplayName: string | null = null
  const sessionToken = await getSessionToken()
  if (sessionToken) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_participant_for_session', {
      p_session_token: sessionToken,
      p_org_id: org.id,
    })
    const p = data as { display_name?: string; first_name?: string } | null
    if (p) {
      sessionDisplayName = p.display_name || p.first_name || 'You'
    }
  }

  return {
    status: 'ready',
    orgName: org.name,
    orgSlug: org.slug,
    telegramUsername: row.telegram_username,
    sessionDisplayName,
  }
}

export async function confirmTelegramPairWithSession(
  orgSlug: string,
  token: string,
): Promise<{ error?: string; displayName?: string }> {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) return { error: 'Group not found.' }

  const sessionToken = await getSessionToken()
  if (!sessionToken) {
    return { error: 'No saved session on this device. Enter your phone below.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_participant_for_session', {
    p_session_token: sessionToken,
    p_org_id: org.id,
  })

  if (error || !data) {
    return { error: 'Session expired — enter your phone below.' }
  }

  const participant = data as { participant_id: string; display_name?: string }
  try {
    const result = await completeTelegramPair(token, String(participant.participant_id))
    return { displayName: result.display_name || participant.display_name || 'Player' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not complete pairing' }
  }
}

export async function confirmTelegramPairWithPhone(
  orgSlug: string,
  token: string,
  formData: FormData,
): Promise<{ error?: string; displayName?: string }> {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) return { error: 'Group not found.' }

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const phone = normalizePhoneDigits(String(formData.get('phone') ?? ''))

  if (!isValidPhoneDigits(phone) || !firstName || !lastName) {
    return { error: 'Enter your name and phone to continue.' }
  }

  const nameError = validateDemoParticipantNames(orgSlug, {
    firstName,
    lastName,
    displayName: null,
  })
  if (nameError) return { error: nameError }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ensure_soft_participant', {
    p_org_id: org.id,
    p_phone: phone,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: null,
  })

  const result = data as { session_token?: string; participant_id?: string } | null
  if (error || !result?.session_token) {
    return { error: error?.message || 'Could not save your profile.' }
  }

  await setSessionToken(String(result.session_token))

  let participantId = result.participant_id
  if (!participantId) {
    const { data: participant } = await supabase.rpc('get_participant_for_session', {
      p_session_token: result.session_token,
      p_org_id: org.id,
    })
    participantId = (participant as { participant_id?: string } | null)?.participant_id
  }

  if (!participantId) {
    return { error: 'Could not resolve your account.' }
  }

  try {
    const paired = await completeTelegramPair(token, String(participantId))
    return { displayName: paired.display_name }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not complete pairing' }
  }
}
