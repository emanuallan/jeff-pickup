'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/auth'
import { getOrgForMember } from '@/lib/orgs'
import { isTelegramBotConfigured, getTelegramBotUsername } from '@/lib/telegram/config'
import {
  createTelegramConnectCode,
  getTelegramOrgLinkByOrgId,
  unlinkTelegramOrg,
  type TelegramOrgLink,
} from '@/lib/telegram/links'

async function requireOrgAdmin(slug: string) {
  const org = await getOrgForMember(slug)
  if (!org) {
    throw new Error('Not authorized')
  }
  return org
}

export type TelegramConsoleState = {
  configured: boolean
  botUsername: string | null
  link: TelegramOrgLink | null
}

export async function getTelegramConsoleState(
  orgSlug: string,
): Promise<TelegramConsoleState | null> {
  const org = await getOrgForMember(orgSlug)
  if (!org) return null

  const link = await getTelegramOrgLinkByOrgId(org.id)
  return {
    configured: isTelegramBotConfigured(),
    botUsername: getTelegramBotUsername(),
    link,
  }
}

export async function generateTelegramConnectCode(
  orgSlug: string,
): Promise<{ code?: string; expiresAt?: string; error?: string }> {
  try {
    const org = await requireOrgAdmin(orgSlug)
    if (!isTelegramBotConfigured()) {
      return { error: 'Telegram bot is not configured on this environment.' }
    }

    const existing = await getTelegramOrgLinkByOrgId(org.id)
    if (existing) {
      return {
        error: 'This group already has a Telegram chat linked. Unlink it first.',
      }
    }

    const user = await getAuthUser()
    const { code, expiresAt } = await createTelegramConnectCode({
      orgId: org.id,
      createdBy: user?.id ?? null,
    })

    revalidatePath(`/console/${orgSlug}/settings`)
    return { code, expiresAt }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not create code' }
  }
}

export async function unlinkTelegramGroup(
  orgSlug: string,
): Promise<{ error?: string }> {
  try {
    const org = await requireOrgAdmin(orgSlug)
    await unlinkTelegramOrg(org.id)
    revalidatePath(`/console/${orgSlug}/settings`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not unlink' }
  }
}
