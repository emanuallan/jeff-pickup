import {
  isEventEnded,
  mapEventRow,
  type EventWithLocation,
} from '@/lib/events'
import { MAX_EVENT_DURATION_MIN } from '@/lib/event-duration'
import { isPaidSession } from '@/lib/session-payment'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPairToken,
  getParticipantIdForTelegramUser,
  getTelegramOrgByChatId,
} from '@/lib/telegram/links'
import {
  formatNeedPairMessage,
  formatPaidSessionMessage,
  formatRsvpReply,
  publicEventUrl,
  telegramPairUrl,
} from '@/lib/telegram/messages'

export type TelegramRsvpAction = 'in' | 'out' | 'maybe'

export type TelegramRsvpResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

type ParticipantRow = {
  id: string
  phone: string
  first_name: string
  last_name: string
  display_name: string
}

const LOCATION_SELECT =
  '*, locations(label, address, lat, lon, maps_url, is_online, meeting_url), schedules!events_schedule_id_fkey(title, duration_min)'

export async function getNextUpcomingEventForOrg(
  orgId: string,
): Promise<EventWithLocation | null> {
  const admin = createAdminClient()
  const now = new Date()
  const lookbackIso = new Date(
    now.getTime() - MAX_EVENT_DURATION_MIN * 60_000,
  ).toISOString()

  const { data, error } = await admin
    .from('events')
    .select(LOCATION_SELECT)
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .gte('starts_at', lookbackIso)
    .order('starts_at', { ascending: true })
    .limit(20)

  if (error || !data?.length) return null

  for (const row of data) {
    const event = mapEventRow(row as Record<string, unknown>)
    if (!isEventEnded(event, now)) {
      return event
    }
  }

  return null
}

async function getParticipant(participantId: string): Promise<ParticipantRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('participants')
    .select('id, phone, first_name, last_name, display_name')
    .eq('id', participantId)
    .maybeSingle()

  if (error || !data) return null
  return data as ParticipantRow
}

async function mintSessionToken(orgId: string, phone: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('recover_participant_session', {
    p_org_id: orgId,
    p_phone: phone,
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = data as { session_token?: string } | null
  if (!result?.session_token) {
    throw new Error('Failed to create session')
  }

  return String(result.session_token)
}

async function getSignupForParticipant(
  eventId: string,
  participantId: string,
): Promise<{ id: string; arrival_status: string; list_status: string } | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('signups')
    .select('id, arrival_status, list_status')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: String(data.id),
    arrival_status: String(data.arrival_status),
    list_status: String(data.list_status ?? 'confirmed'),
  }
}

async function getConfirmedHeadcount(eventId: string): Promise<number | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('event_headcount', {
    p_event_id: eventId,
  })
  if (error) return null
  return typeof data === 'number' ? data : Number(data) || null
}

async function ensurePairPrompt(opts: {
  orgId: string
  orgSlug: string
  telegramUserId: number
  telegramUsername: string | null
}): Promise<string> {
  const { token } = await createPairToken({
    orgId: opts.orgId,
    telegramUserId: opts.telegramUserId,
    telegramUsername: opts.telegramUsername,
  })
  return formatNeedPairMessage(telegramPairUrl(opts.orgSlug, token))
}

export async function handleTelegramRsvp(opts: {
  chatId: number
  telegramUserId: number
  telegramUsername: string | null
  action: TelegramRsvpAction
}): Promise<TelegramRsvpResult> {
  const linked = await getTelegramOrgByChatId(opts.chatId)
  if (!linked) {
    return {
      ok: false,
      message:
        'This chat is not linked to an Organizr group. An organizer can connect it from the console.',
    }
  }

  const participantId = await getParticipantIdForTelegramUser(
    linked.org_id,
    opts.telegramUserId,
  )

  if (!participantId) {
    const message = await ensurePairPrompt({
      orgId: linked.org_id,
      orgSlug: linked.org_slug,
      telegramUserId: opts.telegramUserId,
      telegramUsername: opts.telegramUsername,
    })
    return { ok: false, message }
  }

  const participant = await getParticipant(participantId)
  if (!participant) {
    return { ok: false, message: 'Your linked account was not found. Try /link again.' }
  }

  const event = await getNextUpcomingEventForOrg(linked.org_id)
  if (!event) {
    return { ok: false, message: 'No upcoming sessions for this group.' }
  }

  const eventUrl = publicEventUrl(linked.org_slug, event.short_id)

  if (opts.action !== 'out' && isPaidSession(event.price_cents)) {
    const existing = await getSignupForParticipant(event.id, participantId)
    if (!existing) {
      return { ok: false, message: formatPaidSessionMessage(eventUrl) }
    }
  }

  const admin = createAdminClient()
  const displayName = participant.display_name || participant.first_name || 'Player'

  try {
    if (opts.action === 'out') {
      const existing = await getSignupForParticipant(event.id, participantId)
      if (!existing) {
        return {
          ok: true,
          message: `${displayName} is not signed up for the next session.`,
        }
      }

      const sessionToken = await mintSessionToken(linked.org_id, participant.phone)
      const { error } = await admin.rpc('leave_event', {
        p_signup_id: existing.id,
        p_session_token: sessionToken,
      })

      if (error) {
        return { ok: false, message: error.message }
      }

      return {
        ok: true,
        message: formatRsvpReply({
          displayName,
          status: 'out',
          event,
          headcount: await getConfirmedHeadcount(event.id),
          isOnline: event.location_is_online,
        }),
      }
    }

    const arrivalStatus = opts.action === 'maybe' ? 'maybe' : 'confirmed'
    const existing = await getSignupForParticipant(event.id, participantId)

    if (existing) {
      const sessionToken = await mintSessionToken(linked.org_id, participant.phone)
      const { error } = await admin.rpc('update_arrival_status', {
        p_signup_id: existing.id,
        p_session_token: sessionToken,
        p_status: arrivalStatus,
      })

      if (error) {
        return { ok: false, message: error.message }
      }

      return {
        ok: true,
        message: formatRsvpReply({
          displayName,
          status: arrivalStatus,
          event,
          headcount: await getConfirmedHeadcount(event.id),
          listStatus: existing.list_status,
          isOnline: event.location_is_online,
        }),
      }
    }

    const { data, error } = await admin.rpc('join_event', {
      p_event_id: event.id,
      p_phone: participant.phone,
      p_first_name: participant.first_name,
      p_last_name: participant.last_name,
      p_display_name: participant.display_name,
      p_guest_count: 0,
    })

    if (error) {
      if (error.message === 'GROUP_RULES_REQUIRED') {
        return {
          ok: false,
          message: `Accept the group rules on the web first, then try again:\n${eventUrl}`,
        }
      }
      if (error.message.toLowerCase().includes('requires payment')) {
        return { ok: false, message: formatPaidSessionMessage(eventUrl) }
      }
      return { ok: false, message: error.message }
    }

    const result = data as { signup_id?: string; session_token?: string; list_status?: string } | null
    let listStatus = result?.list_status ?? 'confirmed'

    if (arrivalStatus !== 'confirmed' && result?.signup_id && result.session_token) {
      const { error: statusError } = await admin.rpc('update_arrival_status', {
        p_signup_id: result.signup_id,
        p_session_token: result.session_token,
        p_status: arrivalStatus,
      })
      if (statusError) {
        return { ok: false, message: statusError.message }
      }
    }

    if (result?.signup_id) {
      const signup = await getSignupForParticipant(event.id, participantId)
      if (signup) listStatus = signup.list_status
    }

    return {
      ok: true,
      message: formatRsvpReply({
        displayName,
        status: arrivalStatus,
        event,
        headcount: await getConfirmedHeadcount(event.id),
        listStatus,
        isOnline: event.location_is_online,
      }),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong'
    return { ok: false, message }
  }
}

export async function handleTelegramNext(chatId: number): Promise<TelegramRsvpResult> {
  const linked = await getTelegramOrgByChatId(chatId)
  if (!linked) {
    return {
      ok: false,
      message:
        'This chat is not linked to an Organizr group. An organizer can connect it from the console.',
    }
  }

  const event = await getNextUpcomingEventForOrg(linked.org_id)
  if (!event) {
    return { ok: false, message: 'No upcoming sessions for this group.' }
  }

  const { formatNextSessionMessage } = await import('@/lib/telegram/messages')
  return {
    ok: true,
    message: formatNextSessionMessage(linked.org_name, linked.org_slug, event),
  }
}

export async function handleTelegramAnnounce(chatId: number): Promise<TelegramRsvpResult> {
  return handleTelegramNext(chatId)
}

export async function handleTelegramLinkPrompt(opts: {
  chatId: number
  telegramUserId: number
  telegramUsername: string | null
  /** When true, chat may be a DM without an org link. */
  isPrivateChat: boolean
}): Promise<TelegramRsvpResult> {
  // Always resolve by chat id first — works for groups and avoids relying on
  // chat.type if the client UI looks like a DM (e.g. 2-person group titled with the bot name).
  const linked = await getTelegramOrgByChatId(opts.chatId)

  if (!linked) {
    if (opts.isPrivateChat) {
      return {
        ok: false,
        message:
          'Open your linked Organizr group chat and send /link there (not in this private chat).',
      }
    }
    return {
      ok: false,
      message:
        'This chat is not linked to an Organizr group yet. Generate a connect code in the console and send /connect CODE here.',
    }
  }

  const existing = await getParticipantIdForTelegramUser(
    linked.org_id,
    opts.telegramUserId,
  )
  if (existing) {
    return {
      ok: true,
      message: 'You are already linked. Use /in /out /maybe in the group.',
    }
  }

  try {
    const message = await ensurePairPrompt({
      orgId: linked.org_id,
      orgSlug: linked.org_slug,
      telegramUserId: opts.telegramUserId,
      telegramUsername: opts.telegramUsername,
    })
    return { ok: true, message }
  } catch (e) {
    const err = e instanceof Error ? e.message : 'Could not create pairing link'
    console.error('telegram pair token failed', err)
    return { ok: false, message: err }
  }
}
