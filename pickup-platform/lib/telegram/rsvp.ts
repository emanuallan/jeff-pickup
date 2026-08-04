import {
  isEventEnded,
  mapEventRow,
  type EventWithLocation,
} from '@/lib/events'
import { MAX_EVENT_DURATION_MIN } from '@/lib/event-duration'
import { parseOptionalGuestCountArg, resolveGuestCount } from '@/lib/guest-signups'
import { isPaidSession } from '@/lib/session-payment'
import {
  isSessionTeamNumber,
  sessionTeamLabel,
  sessionTeamsEnabled,
} from '@/lib/session-team'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
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

export type TelegramArrivalAction = 'omw' | 'late'

export type TelegramRsvpResult = {
  ok: boolean
  message: string
  /** Pairing link — deliver via DM; never post the URL in the group. */
  pairViaDm?: boolean
  /** Opaque pair token for link-intent fallback when DM is blocked. */
  pairToken?: string
  orgId?: string
  orgSlug?: string
  /** Absolute web pair URL (for inline keyboard button). */
  pairUrl?: string
}

const ARRIVAL_STATUS_BY_ACTION: Record<TelegramArrivalAction, 'on_my_way' | 'running_late'> = {
  omw: 'on_my_way',
  late: 'running_late',
}

type ParticipantRow = {
  id: string
  phone: string
  first_name: string
  last_name: string
  display_name: string
}

/** Match lib/events.ts so PostgREST embeds resolve the same way as the public site. */
const LOCATION_SELECT =
  '*, locations(label, address, lat, lon, maps_url, is_online, meeting_url), schedules!events_schedule_id_fkey(title, duration_min)'

export async function getNextUpcomingEventForOrg(
  orgId: string,
): Promise<EventWithLocation | null> {
  // Use the cookie-less anon client (same as the public site). The service-role
  // embed select was returning empty/errors here and surfacing as "no sessions".
  const supabase = createPublicClient()
  const now = new Date()
  const lookbackIso = new Date(
    now.getTime() - MAX_EVENT_DURATION_MIN * 60_000,
  ).toISOString()

  async function fetchRows(select: string): Promise<{
    data: Record<string, unknown>[] | null
    error: { message: string } | null
  }> {
    const result = await supabase
      .from('events')
      .select(select)
      .eq('org_id', orgId)
      .neq('status', 'cancelled')
      .gte('starts_at', lookbackIso)
      .order('starts_at', { ascending: true })
      .limit(20)

    return {
      data: (result.data as Record<string, unknown>[] | null) ?? null,
      error: result.error ? { message: result.error.message } : null,
    }
  }

  let { data, error } = await fetchRows(LOCATION_SELECT)

  // Fallback without embeds if the relationship hint fails in this environment.
  if (error) {
    console.error('telegram upcoming events embed query failed', error.message, {
      orgId,
    })
    ;({ data, error } = await fetchRows(
      'id, short_id, org_id, schedule_id, location_id, starts_at, timezone, duration_min, capacity, min_players, status, announcement, additional_information, price_cents, team_count, title',
    ))
  }

  if (error) {
    console.error('telegram getNextUpcomingEventForOrg failed', error.message, {
      orgId,
    })
    return null
  }

  if (!data?.length) return null

  for (const row of data) {
    const event = mapEventRow(row)
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

  if (error) {
    console.error('telegram getParticipant failed', error.message, { participantId })
    return null
  }
  if (!data) return null
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

  if (error) {
    console.error('telegram getSignupForParticipant failed', error.message, {
      eventId,
      participantId,
    })
    return null
  }
  if (!data) return null
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
}): Promise<{ message: string; token: string; pairUrl: string; orgId: string; orgSlug: string }> {
  const { token } = await createPairToken({
    orgId: opts.orgId,
    telegramUserId: opts.telegramUserId,
    telegramUsername: opts.telegramUsername,
  })
  const pairUrl = telegramPairUrl(opts.orgSlug, token)
  return {
    message: formatNeedPairMessage(pairUrl),
    token,
    pairUrl,
    orgId: opts.orgId,
    orgSlug: opts.orgSlug,
  }
}

function pairPromptResult(prompt: {
  message: string
  token: string
  pairUrl: string
  orgId: string
  orgSlug: string
}): TelegramRsvpResult {
  return {
    ok: true,
    message: prompt.message,
    pairViaDm: true,
    pairToken: prompt.token,
    pairUrl: prompt.pairUrl,
    orgId: prompt.orgId,
    orgSlug: prompt.orgSlug,
  }
}

export async function handleTelegramRsvp(opts: {
  chatId: number
  telegramUserId: number
  telegramUsername: string | null
  action: TelegramRsvpAction
  /** Raw text after `/in` (e.g. `"2"`). Ignored unless action is `in`. */
  guestCountArg?: string | null
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
    return pairPromptResult(
      await ensurePairPrompt({
        orgId: linked.org_id,
        orgSlug: linked.org_slug,
        telegramUserId: opts.telegramUserId,
        telegramUsername: opts.telegramUsername,
      }),
    )
  }

  const participant = await getParticipant(participantId)
  if (!participant) {
    return {
      ok: false,
      message:
        'Could not load your linked profile. Try /link again — if it says you are already linked, ask an organizer to check Telegram bot setup.',
    }
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

  let guestCount: number | null = null
  let applyGuestCount = false
  if (opts.action === 'in') {
    const parsed = parseOptionalGuestCountArg(opts.guestCountArg)
    if (parsed != null) {
      const { getPublicOrgBySlug } = await import('@/lib/public-data')
      const { orgFeatures } = await import('@/lib/org-features')
      const org = await getPublicOrgBySlug(linked.org_slug)
      const guestsEnabled = org ? orgFeatures(org).guest_signups : false
      // When guests are disabled, ignore the number (treat as solo signup).
      guestCount = resolveGuestCount(parsed, guestsEnabled)
      applyGuestCount = guestsEnabled
    }
  }

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

      if (applyGuestCount && guestCount != null) {
        const { error: guestError } = await admin.rpc('update_guest_count', {
          p_signup_id: existing.id,
          p_session_token: sessionToken,
          p_guest_count: guestCount,
        })
        if (guestError) {
          return { ok: false, message: guestError.message }
        }
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
          guestCount: applyGuestCount ? guestCount : null,
        }),
      }
    }

    const { data, error } = await admin.rpc('join_event', {
      p_event_id: event.id,
      p_phone: participant.phone,
      p_first_name: participant.first_name,
      p_last_name: participant.last_name,
      p_display_name: participant.display_name,
      p_guest_count: applyGuestCount && guestCount != null ? guestCount : 0,
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
        guestCount: applyGuestCount ? guestCount : null,
      }),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong'
    return { ok: false, message }
  }
}

export async function handleTelegramArrivalStatus(opts: {
  chatId: number
  telegramUserId: number
  telegramUsername: string | null
  action: TelegramArrivalAction
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
    return pairPromptResult(
      await ensurePairPrompt({
        orgId: linked.org_id,
        orgSlug: linked.org_slug,
        telegramUserId: opts.telegramUserId,
        telegramUsername: opts.telegramUsername,
      }),
    )
  }

  const participant = await getParticipant(participantId)
  if (!participant) {
    return {
      ok: false,
      message:
        'Could not load your linked profile. Try /link again — if it says you are already linked, ask an organizer to check Telegram bot setup.',
    }
  }

  const event = await getNextUpcomingEventForOrg(linked.org_id)
  if (!event) {
    return { ok: false, message: 'No upcoming sessions for this group.' }
  }

  const existing = await getSignupForParticipant(event.id, participantId)
  if (!existing) {
    return {
      ok: false,
      message: "You're not signed up for the next session. Use /in first.",
    }
  }

  try {
    const admin = createAdminClient()
    const sessionToken = await mintSessionToken(linked.org_id, participant.phone)
    const { error } = await admin.rpc('update_arrival_status', {
      p_signup_id: existing.id,
      p_session_token: sessionToken,
      p_status: ARRIVAL_STATUS_BY_ACTION[opts.action],
    })

    if (error) {
      return { ok: false, message: error.message }
    }

    return { ok: true, message: 'Status updated' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong'
    return { ok: false, message }
  }
}

/** Parse `/join 2` → team number, or null if missing/invalid format. */
export function parseTelegramTeamArg(raw: string | undefined | null): number | null {
  const token = raw?.trim().split(/\s+/)[0]
  if (!token) return null
  if (!/^\d+$/.test(token)) return null
  return Number.parseInt(token, 10)
}

export async function handleTelegramJoinTeam(opts: {
  chatId: number
  telegramUserId: number
  telegramUsername: string | null
  teamArg?: string | null
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
    return pairPromptResult(
      await ensurePairPrompt({
        orgId: linked.org_id,
        orgSlug: linked.org_slug,
        telegramUserId: opts.telegramUserId,
        telegramUsername: opts.telegramUsername,
      }),
    )
  }

  const participant = await getParticipant(participantId)
  if (!participant) {
    return {
      ok: false,
      message:
        'Could not load your linked profile. Try /link again — if it says you are already linked, ask an organizer to check Telegram bot setup.',
    }
  }

  const event = await getNextUpcomingEventForOrg(linked.org_id)
  if (!event) {
    return { ok: false, message: 'No upcoming sessions for this group.' }
  }

  const { getPublicOrgBySlug } = await import('@/lib/public-data')
  const { orgFeatures } = await import('@/lib/org-features')
  const org = await getPublicOrgBySlug(linked.org_slug)
  const features = org ? orgFeatures(org) : null
  const teamsOn =
    features != null && sessionTeamsEnabled(features.team_selection, event.team_count)

  if (!teamsOn || event.team_count == null) {
    return {
      ok: false,
      message: 'Teams are not enabled for this session. Use /in to sign up.',
    }
  }

  const team = parseTelegramTeamArg(opts.teamArg)
  if (team == null || !isSessionTeamNumber(team, event.team_count)) {
    return {
      ok: false,
      message: `Usage: /join 1 … /join ${event.team_count} (pick a team for this session).`,
    }
  }

  const eventUrl = publicEventUrl(linked.org_slug, event.short_id)
  const admin = createAdminClient()
  const displayName = participant.display_name || participant.first_name || 'Player'

  try {
    let existing = await getSignupForParticipant(event.id, participantId)

    if (!existing) {
      if (isPaidSession(event.price_cents)) {
        return { ok: false, message: formatPaidSessionMessage(eventUrl) }
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

      const result = data as { signup_id?: string; list_status?: string } | null
      if (result?.list_status === 'waitlisted' || !result?.signup_id) {
        return {
          ok: false,
          message:
            "You're on the waitlist — team pick is only for confirmed signups.",
        }
      }

      existing = {
        id: String(result.signup_id),
        arrival_status: 'confirmed',
        list_status: 'confirmed',
      }
    }

    if (existing.list_status === 'waitlisted') {
      return {
        ok: false,
        message: "You're on the waitlist — team pick is only for confirmed signups.",
      }
    }

    const sessionToken = await mintSessionToken(linked.org_id, participant.phone)
    const { error: teamError } = await admin.rpc('update_signup_team', {
      p_signup_id: existing.id,
      p_session_token: sessionToken,
      p_team: String(team),
    })

    if (teamError) {
      return { ok: false, message: teamError.message }
    }

    return {
      ok: true,
      message: `${displayName} → ${sessionTeamLabel(team)}`,
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

async function loadNextSessionForChat(chatId: number): Promise<
  | { ok: false; message: string }
  | {
      ok: true
      linked: NonNullable<Awaited<ReturnType<typeof getTelegramOrgByChatId>>>
      event: NonNullable<Awaited<ReturnType<typeof getNextUpcomingEventForOrg>>>
    }
> {
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

  return { ok: true, linked, event }
}

export async function handleTelegramCount(chatId: number): Promise<TelegramRsvpResult> {
  const loaded = await loadNextSessionForChat(chatId)
  if (!loaded.ok) return loaded

  const { getPublicRosterLive } = await import('@/lib/public-data')
  const { rosterHeadcount } = await import('@/lib/signups')
  const { formatCountMessage } = await import('@/lib/telegram/messages')

  const roster = await getPublicRosterLive(loaded.event.id)
  return { ok: true, message: formatCountMessage(rosterHeadcount(roster)) }
}

export async function handleTelegramRoster(chatId: number): Promise<TelegramRsvpResult> {
  const loaded = await loadNextSessionForChat(chatId)
  if (!loaded.ok) return loaded

  const { getPublicOrgBySlug, getPublicRosterLive, getPublicWaitlistLive } = await import(
    '@/lib/public-data'
  )
  const { orgFeatures } = await import('@/lib/org-features')
  const { rosterHeadcount } = await import('@/lib/signups')
  const { sessionTeamsEnabled } = await import('@/lib/session-team')
  const { formatRosterMessage } = await import('@/lib/telegram/messages')

  const org = await getPublicOrgBySlug(loaded.linked.org_slug)
  if (!org || !orgFeatures(org).public_roster) {
    return {
      ok: false,
      message: 'The roster is private for this group. Try /count for the headcount.',
    }
  }

  const waitlistEnabled = loaded.event.capacity != null
  const [roster, waitlist] = await Promise.all([
    getPublicRosterLive(loaded.event.id),
    waitlistEnabled ? getPublicWaitlistLive(loaded.event.id) : Promise.resolve([]),
  ])

  const features = orgFeatures(org)
  const teamsOn =
    sessionTeamsEnabled(features.team_selection, loaded.event.team_count)

  return {
    ok: true,
    message: formatRosterMessage({
      event: loaded.event,
      roster,
      waitlist,
      headcount: rosterHeadcount(roster),
      teamCount: teamsOn ? loaded.event.team_count : null,
    }),
  }
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
    return pairPromptResult(
      await ensurePairPrompt({
        orgId: linked.org_id,
        orgSlug: linked.org_slug,
        telegramUserId: opts.telegramUserId,
        telegramUsername: opts.telegramUsername,
      }),
    )
  } catch (e) {
    const err = e instanceof Error ? e.message : 'Could not create pairing link'
    console.error('telegram pair token failed', err)
    return { ok: false, message: err }
  }
}

/** Handle /start i_<intentId> — redeem pending link intent and DM the pair URL. */
export async function handleTelegramStartLinkIntent(
  startPayload: string,
  telegramUserId: number,
): Promise<TelegramRsvpResult | null> {
  const trimmed = startPayload.trim()
  if (!trimmed.startsWith('i_') || trimmed.length <= 2) return null

  const intentId = trimmed.slice(2)
  const { redeemLinkIntent } = await import('@/lib/telegram/links')
  const { formatLinkIntentStartMessage } = await import('@/lib/telegram/messages')

  try {
    const redeemed = await redeemLinkIntent(intentId, telegramUserId)
    if (!redeemed) {
      return {
        ok: false,
        message: 'That start link expired or was already used. Send /link in your group again.',
      }
    }

    const pairUrl = telegramPairUrl(redeemed.org_slug, redeemed.pair_token)
    return {
      ok: true,
      message: formatLinkIntentStartMessage(pairUrl),
      pairUrl,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load your pairing link'
    return { ok: false, message }
  }
}

/** Handle /start p_<pairToken> — only for the Telegram user the token was minted for. */
export async function handleTelegramStartPairPayload(
  startPayload: string,
  telegramUserId: number,
): Promise<TelegramRsvpResult | null> {
  const trimmed = startPayload.trim()
  if (!trimmed.startsWith('p_') || trimmed.length <= 2) return null

  const token = trimmed.slice(2)
  const { getOpenPairToken } = await import('@/lib/telegram/links')
  const row = await getOpenPairToken(token)
  if (!row || row.used_at) {
    return {
      ok: false,
      message: 'That pairing link expired or was already used. Go back to the group and send /link again.',
    }
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      message: 'That pairing link expired. Go back to the group and send /link again.',
    }
  }

  if (Number(row.telegram_user_id) !== Number(telegramUserId)) {
    return {
      ok: false,
      message: 'That pairing link belongs to a different Telegram account. Send /link from the group with your own account.',
    }
  }

  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from('orgs')
    .select('slug')
    .eq('id', row.org_id)
    .maybeSingle()

  if (error || !org?.slug) {
    console.error('telegram start pair org lookup failed', error?.message)
    return {
      ok: false,
      message: 'Could not load your pairing link. Go back to the group and send /link again.',
    }
  }

  const pairUrl = telegramPairUrl(String(org.slug), token)
  return {
    ok: true,
    message: formatNeedPairMessage(pairUrl),
    pairUrl,
  }
}
