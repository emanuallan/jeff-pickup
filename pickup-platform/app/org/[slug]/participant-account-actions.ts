'use server'

import { revalidatePath } from 'next/cache'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { linkCurrentSessionParticipant } from '@/lib/participant-account'

export async function saveParticipantAccount(
  orgSlug: string,
): Promise<{ ok: true } | { error: string }> {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Organization not found.' }
  }

  const result = await linkCurrentSessionParticipant(org.id)
  if ('error' in result) {
    return { error: result.error }
  }

  revalidatePath(`/org/${orgSlug}`)
  revalidatePath('/me')
  return { ok: true }
}
