import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONNECT_CODE_TTL_MS,
  generateConnectCode,
  LINK_INTENT_TTL_MS,
  PAIR_TOKEN_TTL_MS,
} from '@/lib/telegram/tokens'

export type TelegramOrgLink = {
  org_id: string
  telegram_chat_id: number
  chat_title: string | null
  linked_at: string
  announce_sessions: boolean
  announce_mvp: boolean
}

export type TelegramOrgByChat = TelegramOrgLink & {
  org_slug: string
  org_name: string
}

/** Pass chat/user ids as strings so bigint values stay exact for PostgREST. */
function asTelegramId(id: number | string): string {
  return String(id)
}

export async function getTelegramOrgLinkByOrgId(
  orgId: string,
): Promise<TelegramOrgLink | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('telegram_org_links')
    .select(
      'org_id, telegram_chat_id, chat_title, linked_at, announce_sessions, announce_mvp',
    )
    .eq('org_id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return data as TelegramOrgLink
}

export async function getTelegramOrgByChatId(
  chatId: number,
): Promise<TelegramOrgByChat | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_telegram_org_by_chat', {
    p_telegram_chat_id: asTelegramId(chatId),
  })

  if (error) {
    console.error('get_telegram_org_by_chat failed', error.message)
    return null
  }

  const row = data as {
    org_id?: string
    org_slug?: string
    org_name?: string
    telegram_chat_id?: number | string
    chat_title?: string | null
    linked_at?: string
    announce_sessions?: boolean
    announce_mvp?: boolean
  } | null

  if (!row?.org_id || !row.org_slug || !row.org_name) return null

  return {
    org_id: String(row.org_id),
    org_slug: String(row.org_slug),
    org_name: String(row.org_name),
    telegram_chat_id: Number(row.telegram_chat_id),
    chat_title: row.chat_title ?? null,
    linked_at: String(row.linked_at ?? ''),
    announce_sessions: row.announce_sessions !== false,
    announce_mvp: row.announce_mvp !== false,
  }
}

/** @deprecated Prefer getTelegramOrgByChatId — kept for call sites that only need the link row. */
export async function getTelegramOrgLinkByChatId(
  chatId: number,
): Promise<TelegramOrgLink | null> {
  const row = await getTelegramOrgByChatId(chatId)
  if (!row) return null
  return {
    org_id: row.org_id,
    telegram_chat_id: row.telegram_chat_id,
    chat_title: row.chat_title,
    linked_at: row.linked_at,
    announce_sessions: row.announce_sessions,
    announce_mvp: row.announce_mvp,
  }
}

export async function unlinkTelegramOrg(orgId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('telegram_org_links').delete().eq('org_id', orgId)
  if (error) throw error
}

export async function createTelegramConnectCode(opts: {
  orgId: string
  createdBy: string | null
}): Promise<{ code: string; expiresAt: string }> {
  const admin = createAdminClient()
  const code = generateConnectCode()
  const expiresAt = new Date(Date.now() + CONNECT_CODE_TTL_MS).toISOString()

  const { error } = await admin.from('telegram_connect_codes').insert({
    org_id: opts.orgId,
    code,
    created_by: opts.createdBy,
    expires_at: expiresAt,
  })

  if (error) throw error
  return { code, expiresAt }
}

export async function redeemConnectCode(opts: {
  code: string
  chatId: number
  chatTitle: string | null
}): Promise<{ org_id: string; org_slug: string; org_name: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('redeem_telegram_connect_code', {
    p_code: opts.code,
    p_telegram_chat_id: asTelegramId(opts.chatId),
    p_chat_title: opts.chatTitle,
  })

  if (error) throw new Error(error.message)

  const result = data as {
    org_id?: string
    org_slug?: string
    org_name?: string
  } | null

  if (!result?.org_id || !result.org_slug || !result.org_name) {
    throw new Error('Failed to link group')
  }

  // Avoid blasting historical MVP results the first time a group is linked.
  const { suppressHistoricalTelegramMvpAnnouncements } = await import(
    '@/lib/telegram/announce'
  )
  await suppressHistoricalTelegramMvpAnnouncements(result.org_id)

  return {
    org_id: result.org_id,
    org_slug: result.org_slug,
    org_name: result.org_name,
  }
}

export async function getParticipantIdForTelegramUser(
  orgId: string,
  telegramUserId: number,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_telegram_participant_link', {
    p_org_id: orgId,
    p_telegram_user_id: asTelegramId(telegramUserId),
  })

  if (error) {
    console.error('get_telegram_participant_link failed', error.message)
    return null
  }

  const row = data as { participant_id?: string } | null
  if (!row?.participant_id) return null
  return String(row.participant_id)
}

export async function createPairToken(opts: {
  orgId: string
  telegramUserId: number
  telegramUsername: string | null
}): Promise<{ token: string; expiresAt: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('create_telegram_pair_token', {
    p_org_id: opts.orgId,
    p_telegram_user_id: asTelegramId(opts.telegramUserId),
    p_telegram_username: opts.telegramUsername,
    p_ttl_minutes: Math.round(PAIR_TOKEN_TTL_MS / 60_000),
  })

  if (error) throw new Error(error.message)

  const result = data as { token?: string; expires_at?: string } | null
  if (!result?.token || !result.expires_at) {
    throw new Error('Failed to create pairing link')
  }

  return { token: result.token, expiresAt: result.expires_at }
}

export async function createLinkIntent(opts: {
  orgId: string
  telegramUserId: number
  telegramUsername: string | null
  pairToken: string
}): Promise<{ id: string; expiresAt: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('create_telegram_link_intent', {
    p_org_id: opts.orgId,
    p_telegram_user_id: asTelegramId(opts.telegramUserId),
    p_telegram_username: opts.telegramUsername,
    p_pair_token: opts.pairToken,
    p_ttl_minutes: Math.round(LINK_INTENT_TTL_MS / 60_000),
  })

  if (error) throw new Error(error.message)

  const result = data as { id?: string; expires_at?: string } | null
  if (!result?.id || !result.expires_at) {
    throw new Error('Failed to create link intent')
  }

  return { id: result.id, expiresAt: result.expires_at }
}

export type LinkIntentRedeem = {
  org_id: string
  org_slug: string
  org_name: string
  pair_token: string
  telegram_user_id: number
}

export async function redeemLinkIntent(
  intentId: string,
  telegramUserId: number,
): Promise<LinkIntentRedeem | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('redeem_telegram_link_intent', {
    p_intent_id: intentId,
    p_telegram_user_id: asTelegramId(telegramUserId),
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  const row = data as {
    org_id?: string
    org_slug?: string
    org_name?: string
    pair_token?: string
    telegram_user_id?: number | string
  }

  if (!row.org_id || !row.org_slug || !row.org_name || !row.pair_token) {
    return null
  }

  return {
    org_id: String(row.org_id),
    org_slug: String(row.org_slug),
    org_name: String(row.org_name),
    pair_token: String(row.pair_token),
    telegram_user_id: Number(row.telegram_user_id),
  }
}

export type PairTokenRow = {
  token: string
  org_id: string
  telegram_user_id: number
  telegram_username: string | null
  expires_at: string
  used_at: string | null
}

export async function getOpenPairToken(token: string): Promise<PairTokenRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_telegram_pair_token', {
    p_token: token,
  })

  if (error) {
    console.error('get_telegram_pair_token failed', error.message)
    return null
  }

  if (!data) return null
  return data as PairTokenRow
}

export type OpenPairTokenForUser = PairTokenRow & {
  org_slug: string
  org_name: string
}

/** Latest unused pair token for this Telegram user (Phase B contact-share). */
export async function getLatestOpenPairTokenForUser(
  telegramUserId: number,
): Promise<OpenPairTokenForUser | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_open_telegram_pair_token_for_user', {
    p_telegram_user_id: asTelegramId(telegramUserId),
  })

  if (error) {
    console.error('get_open_telegram_pair_token_for_user failed', error.message)
    return null
  }

  if (!data) return null

  const row = data as {
    token?: string
    org_id?: string
    org_slug?: string
    org_name?: string
    telegram_user_id?: number | string
    telegram_username?: string | null
    expires_at?: string
    used_at?: string | null
  }

  if (!row.token || !row.org_id || !row.org_slug || !row.org_name || !row.expires_at) {
    return null
  }

  return {
    token: String(row.token),
    org_id: String(row.org_id),
    org_slug: String(row.org_slug),
    org_name: String(row.org_name),
    telegram_user_id: Number(row.telegram_user_id),
    telegram_username: row.telegram_username ?? null,
    expires_at: String(row.expires_at),
    used_at: row.used_at ?? null,
  }
}

export async function completeTelegramPair(
  token: string,
  participantId: string,
): Promise<{ display_name: string; org_id: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('complete_telegram_pair', {
    p_token: token,
    p_participant_id: participantId,
  })

  if (error) throw new Error(error.message)

  const result = data as {
    display_name?: string
    org_id?: string
  } | null

  if (!result?.org_id) {
    throw new Error('Failed to complete pairing')
  }

  return {
    display_name: result.display_name ?? 'Player',
    org_id: result.org_id,
  }
}

export async function unlinkTelegramParticipant(
  orgId: string,
  telegramUserId: number,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('telegram_participant_links')
    .delete()
    .eq('org_id', orgId)
    .eq('telegram_user_id', asTelegramId(telegramUserId))

  if (error) throw error
}
