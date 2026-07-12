'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { isAllowedFeedReactionEmoji } from '@/lib/org-session-feed-reactions'
import {
  feedItemReactionTarget,
  parseFeedReactionToggleResult,
  type OrgSessionFeedItem,
  type OrgSessionFeedReaction,
} from '@/lib/org-session-feed'

function revalidateOrgPaths(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}`, 'layout')
  revalidatePath(`/org/${orgSlug}`)
}

async function requireParticipantSession(orgSlug: string) {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Organization not found.' as const }
  }

  const token = await getSessionToken()
  if (!token) {
    return { error: 'Sign in to your session to react.' as const }
  }

  return { org, token }
}

export async function toggleOrgSessionFeedReaction(
  orgSlug: string,
  item: OrgSessionFeedItem,
  emoji: string,
): Promise<{ reactions: OrgSessionFeedReaction[] } | { error: string }> {
  if (!isAllowedFeedReactionEmoji(emoji)) {
    return { error: 'Invalid reaction.' }
  }

  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const target = feedItemReactionTarget(item)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('toggle_org_session_feed_reaction', {
    p_session_token: session.token,
    p_org_id: session.org.id,
    p_feed_kind: target.feedKind,
    p_event_id: target.eventId,
    p_subject_participant_id: target.subjectParticipantId,
    p_emoji: emoji,
  })

  if (error) return { error: error.message }

  const reactions = parseFeedReactionToggleResult(data)
  if (!reactions) return { error: 'Could not update reaction.' }

  revalidateOrgPaths(orgSlug)
  return { reactions }
}
