import { createAdminClient } from '@/lib/supabase/admin'

export async function materializeSessionFeedbackNotifications(
  lookbackHours = 24,
): Promise<number> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('materialize_session_feedback_notifications', {
    p_lookback_hours: lookbackHours,
  })

  if (error) {
    throw error
  }

  return typeof data === 'number' ? data : 0
}

export async function finalizePendingSessionMvpVotes(
  lookbackHours = 48,
): Promise<number> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('finalize_pending_session_mvp_votes', {
    p_lookback_hours: lookbackHours,
  })

  if (error) {
    throw error
  }

  return typeof data === 'number' ? data : 0
}
