import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONNECT_CODE_TTL_MS,
  generateConnectCode,
  generatePairToken,
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

export async function getTelegramOrgLinkByChatId(
  chatId: number,
): Promise<TelegramOrgLink | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('telegram_org_links')
    .select(
      'org_id, telegram_chat_id, chat_title, linked_at, announce_sessions, announce_mvp',
    )
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (error || !data) return null
  return data as TelegramOrgLink
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
    p_telegram_chat_id: opts.chatId,
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
  const { data, error } = await admin
    .from('telegram_participant_links')
    .select('participant_id')
    .eq('org_id', orgId)
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle()

  if (error || !data) return null
  return String(data.participant_id)
}

export async function createPairToken(opts: {
  orgId: string
  telegramUserId: number
  telegramUsername: string | null
}): Promise<{ token: string; expiresAt: string }> {
  const admin = createAdminClient()
  const token = generatePairToken()
  const expiresAt = new Date(Date.now() + PAIR_TOKEN_TTL_MS).toISOString()

  const { error } = await admin.from('telegram_pair_tokens').insert({
    token,
    org_id: opts.orgId,
    telegram_user_id: opts.telegramUserId,
    telegram_username: opts.telegramUsername,
    expires_at: expiresAt,
  })

  if (error) throw error
  return { token, expiresAt }
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
  const { data, error } = await admin
    .from('telegram_pair_tokens')
    .select('token, org_id, telegram_user_id, telegram_username, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null
  return data as PairTokenRow
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
    .eq('telegram_user_id', telegramUserId)

  if (error) throw error
}
