import { isValidPhoneDigits, normalizePhoneDigits } from '@/lib/phone'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  completeTelegramPair,
  getLatestOpenPairTokenForUser,
  getParticipantIdForTelegramUser,
} from '@/lib/telegram/links'
import { formatContactPairedMessage } from '@/lib/telegram/messages'

export type TelegramContactPayload = {
  phone_number?: string
  first_name?: string
  last_name?: string
  /** Present when shared via request_contact for the sender's own number. */
  user_id?: number
}

/** Reject forwarded / address-book contacts that Telegram did not verify as the sender. */
export function assertTelegramContactIsOwn(
  fromUserId: number,
  contact: TelegramContactPayload,
): string | null {
  if (contact.user_id == null) {
    return "Please use the Share phone number button so Telegram can verify it's you."
  }
  if (Number(contact.user_id) !== Number(fromUserId)) {
    return "That contact isn't your own number. Use Share phone number for your account."
  }
  if (!contact.phone_number?.trim()) {
    return 'No phone number on that contact.'
  }
  return null
}

export function resolveTelegramPairNames(opts: {
  contactFirst?: string | null
  contactLast?: string | null
  fromFirst?: string | null
  fromLast?: string | null
}): { firstName: string; lastName: string } {
  const firstName = (opts.contactFirst || opts.fromFirst || 'Player').trim() || 'Player'
  const lastName = (opts.contactLast || opts.fromLast || 'User').trim() || 'User'
  return { firstName, lastName }
}

async function findParticipantIdByOrgPhone(
  orgId: string,
  phone: string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('participants')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    console.error('telegram findParticipantIdByOrgPhone failed', error.message)
    return null
  }
  return data?.id ? String(data.id) : null
}

export async function handleTelegramContactPair(opts: {
  telegramUserId: number
  telegramUsername: string | null
  fromFirstName?: string | null
  fromLastName?: string | null
  contact: TelegramContactPayload
}): Promise<{ ok: boolean; message: string }> {
  const ownershipError = assertTelegramContactIsOwn(opts.telegramUserId, opts.contact)
  if (ownershipError) {
    return { ok: false, message: ownershipError }
  }

  const phone = normalizePhoneDigits(String(opts.contact.phone_number))
  if (!isValidPhoneDigits(phone)) {
    return {
      ok: false,
      message:
        "That phone number doesn't look valid. Try Share phone number again, or use the website pairing link.",
    }
  }

  const pending = await getLatestOpenPairTokenForUser(opts.telegramUserId)
  if (!pending) {
    return {
      ok: false,
      message:
        'No open pairing request found. Send /link in your group first, then share your phone here.',
    }
  }

  if (Number(pending.telegram_user_id) !== Number(opts.telegramUserId)) {
    return { ok: false, message: 'That pairing request belongs to a different Telegram account.' }
  }

  const already = await getParticipantIdForTelegramUser(pending.org_id, opts.telegramUserId)
  if (already) {
    try {
      await completeTelegramPair(pending.token, already)
    } catch {
      // Already linked; ignore token burn failures (expired/used races).
    }
    return {
      ok: true,
      message: `You're already linked for ${pending.org_name}. Go back to your group and send /in.`,
    }
  }

  // Existing soft participant: link only — do not overwrite name/email/display.
  const existingId = await findParticipantIdByOrgPhone(pending.org_id, phone)
  if (existingId) {
    try {
      const paired = await completeTelegramPair(pending.token, existingId)
      return {
        ok: true,
        message: formatContactPairedMessage(paired.display_name, pending.org_name),
      }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Could not complete pairing',
      }
    }
  }

  const { firstName, lastName } = resolveTelegramPairNames({
    contactFirst: opts.contact.first_name,
    contactLast: opts.contact.last_name,
    fromFirst: opts.fromFirstName,
    fromLast: opts.fromLastName,
  })

  const nameError = validateDemoParticipantNames(pending.org_slug, {
    firstName,
    lastName,
    displayName: null,
  })
  if (nameError) {
    return { ok: false, message: nameError }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('ensure_soft_participant', {
    p_org_id: pending.org_id,
    p_phone: phone,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: null,
  })

  const result = data as { participant_id?: string } | null
  if (error || !result?.participant_id) {
    return {
      ok: false,
      message: error?.message || 'Could not save your profile. Try the website pairing link instead.',
    }
  }

  try {
    const paired = await completeTelegramPair(pending.token, String(result.participant_id))
    return {
      ok: true,
      message: formatContactPairedMessage(paired.display_name, pending.org_name),
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Could not complete pairing',
    }
  }
}
