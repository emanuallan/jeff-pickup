import { materializeEvents } from '@/lib/materializer'
import {
  finalizePendingSessionMvpVotes,
  materializeSessionFeedbackNotifications,
} from '@/lib/session-feedback-materializer'
import { announcePendingTelegramMvps } from '@/lib/telegram/announce'

/**
 * Vercel Cron hits this daily (Hobby: once/day max).
 * Schedule: 16:00 UTC ≈ 12:00 PM Eastern during EDT (11:00 AM EST in winter).
 * Hobby may invoke anytime within that UTC hour.
 *
 * Runs: event materialization, feedback notification materialization,
 * MVP vote finalization sweep, Telegram MVP announcements.
 *
 * Protect with CRON_SECRET — set the same value in Vercel env vars.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await materializeEvents()
    const feedbackCount = await materializeSessionFeedbackNotifications()
    const mvpFinalizedCount = await finalizePendingSessionMvpVotes()
    const telegramMvpAnnounced = await announcePendingTelegramMvps()
    return Response.json({
      ok: true,
      count,
      feedbackCount,
      mvpFinalizedCount,
      telegramMvpAnnounced,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Materialization failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
