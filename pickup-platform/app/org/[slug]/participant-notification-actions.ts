'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/participant-session'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { validateSessionFeedbackInput } from '@/lib/session-feedback'
import { validateSessionPlayerStatsInput } from '@/lib/session-debrief'
import type { SessionDebriefStep } from '@/lib/session-debrief'
import { parseSessionDebriefState } from '@/lib/session-debrief'

function revalidateOrgPaths(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}`, 'layout')
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath('/console', 'layout')
}

async function requireParticipantSession(orgSlug: string) {
  const org = await getPublicOrgBySlug(orgSlug)
  if (!org) {
    return { error: 'Organization not found.' as const }
  }

  const token = await getSessionToken()
  if (!token) {
    return { error: 'Sign in to your session to continue.' as const }
  }

  return { org, token }
}

export async function markParticipantNotificationRead(
  orgSlug: string,
  notificationId: string,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_participant_notification_read', {
    p_notification_id: notificationId,
    p_session_token: session.token,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function dismissParticipantNotification(
  orgSlug: string,
  notificationId: string,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('dismiss_participant_notification', {
    p_notification_id: notificationId,
    p_session_token: session.token,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function submitSessionFeedback(
  orgSlug: string,
  eventId: string,
  rating: number,
  comment: string,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const validation = validateSessionFeedbackInput(rating, comment)
  if (!validation.ok) return { error: validation.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_session_feedback', {
    p_session_token: session.token,
    p_event_id: eventId,
    p_rating: rating,
    p_comment: comment.trim() || null,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function markSessionNoAttend(orgSlug: string, eventId: string) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_session_no_attend', {
    p_session_token: session.token,
    p_event_id: eventId,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function getSessionDebriefState(orgSlug: string, eventId: string) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_session_debrief_state', {
    p_session_token: session.token,
    p_event_id: eventId,
  })

  if (error) return { error: error.message }

  const state = parseSessionDebriefState(data)
  if (!state) return { error: 'Could not load debrief state.' }
  return { ok: true as const, state }
}

export async function submitSessionMvpVote(
  orgSlug: string,
  eventId: string,
  nomineeParticipantId: string,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_session_mvp_vote', {
    p_session_token: session.token,
    p_event_id: eventId,
    p_nominee_participant_id: nomineeParticipantId,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function skipSessionDebriefStep(
  orgSlug: string,
  eventId: string,
  step: SessionDebriefStep,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('skip_session_debrief_step', {
    p_session_token: session.token,
    p_event_id: eventId,
    p_step: step,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}

export async function submitSessionPlayerStats(
  orgSlug: string,
  eventId: string,
  goals: number,
  assists: number,
) {
  const session = await requireParticipantSession(orgSlug)
  if ('error' in session) return { error: session.error }

  const validation = validateSessionPlayerStatsInput(goals, assists)
  if (!validation.ok) return { error: validation.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_session_player_stats', {
    p_session_token: session.token,
    p_event_id: eventId,
    p_goals: goals,
    p_assists: assists,
  })

  if (error) return { error: error.message }
  revalidateOrgPaths(orgSlug)
  return { ok: true as const }
}
