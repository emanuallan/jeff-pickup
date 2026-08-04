import { eventDisplayName, formatEventWhenLine } from '@/lib/events'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTelegramBotToken } from '@/lib/telegram/config'
import { getTelegramOrgLinkByOrgId } from '@/lib/telegram/links'
import { formatMvpAnnouncement, publicEventUrl } from '@/lib/telegram/messages'

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = getTelegramBotToken()
  if (!token) return false

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  })

  return res.ok
}

export async function announceSessionMvpToTelegram(eventId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: finalization } = await admin
    .from('session_mvp_finalizations')
    .select('event_id, org_id, telegram_announced_at')
    .eq('event_id', eventId)
    .maybeSingle()

  if (!finalization || finalization.telegram_announced_at) {
    return false
  }

  const link = await getTelegramOrgLinkByOrgId(String(finalization.org_id))
  if (!link?.announce_mvp) return false

  const { data: event, error: eventError } = await admin
    .from('events')
    .select(
      'id, org_id, short_id, title, starts_at, timezone, duration_min, schedules!events_schedule_id_fkey(title)',
    )
    .eq('id', eventId)
    .maybeSingle()

  if (eventError || !event) return false

  const { data: awards } = await admin
    .from('session_mvp_awards')
    .select('participant_id')
    .eq('event_id', eventId)

  const participantIds = (awards ?? []).map((a) => String(a.participant_id))
  let winnerNames: string[] = []

  if (participantIds.length > 0) {
    const { data: participants } = await admin
      .from('participants')
      .select('id, display_name, first_name')
      .in('id', participantIds)

    const byId = new Map(
      (participants ?? []).map((p) => [
        String(p.id),
        String(p.display_name || p.first_name || 'Player'),
      ]),
    )
    winnerNames = participantIds.map((id) => byId.get(id) ?? 'Player')
  }

  const { data: org } = await admin
    .from('orgs')
    .select('slug, name')
    .eq('id', event.org_id)
    .maybeSingle()

  if (!org) return false

  const schedule = event.schedules as { title?: string } | { title?: string }[] | null
  const scheduleTitle = Array.isArray(schedule) ? schedule[0]?.title : schedule?.title
  const title =
    (typeof event.title === 'string' && event.title.trim()) || scheduleTitle || null

  const eventLike = {
    title,
    starts_at: String(event.starts_at),
    timezone: String(event.timezone ?? 'UTC'),
    duration_min: Number(event.duration_min) || 90,
  }

  const message = formatMvpAnnouncement({
    orgName: String(org.name),
    sessionTitle: eventDisplayName(eventLike.title),
    when: formatEventWhenLine(eventLike),
    winnerNames,
    eventUrl: publicEventUrl(String(org.slug), String(event.short_id)),
  })

  const sent = await sendTelegramMessage(link.telegram_chat_id, message)
  if (!sent) return false

  await admin
    .from('session_mvp_finalizations')
    .update({ telegram_announced_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .is('telegram_announced_at', null)

  return true
}

/** Announce MVP winners for finalizations that have not been posted to Telegram yet. */
export async function announcePendingTelegramMvps(
  lookbackHours = 72,
): Promise<number> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await admin
    .from('session_mvp_finalizations')
    .select('event_id')
    .is('telegram_announced_at', null)
    .gte('finalized_at', since)
    .limit(50)

  if (error || !rows?.length) return 0

  let announced = 0
  for (const row of rows) {
    const ok = await announceSessionMvpToTelegram(String(row.event_id))
    if (ok) announced += 1
  }

  return announced
}
