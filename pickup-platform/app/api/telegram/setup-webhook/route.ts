import { getTelegramBot, TELEGRAM_BOT_COMMANDS } from '@/lib/telegram/bot'
import {
  getTelegramBotToken,
  getTelegramWebhookSecret,
  isTelegramBotConfigured,
} from '@/lib/telegram/config'
import { rootBaseUrl } from '@/lib/site-url'

export const runtime = 'nodejs'

/**
 * One-time / ops helper: register the Telegram webhook + bot commands.
 * Auth: Bearer CRON_SECRET (same as materialize cron).
 *
 * POST /api/telegram/setup-webhook
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isTelegramBotConfigured()) {
    return Response.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 503 })
  }

  const bot = getTelegramBot()
  const token = getTelegramBotToken()
  if (!bot || !token) {
    return Response.json({ error: 'Bot unavailable' }, { status: 503 })
  }

  const webhookUrl = `${rootBaseUrl()}/api/telegram/webhook`
  const webhookSecret = getTelegramWebhookSecret()

  await bot.api.setWebhook(webhookUrl, {
    secret_token: webhookSecret ?? undefined,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  })

  await bot.api.setMyCommands([...TELEGRAM_BOT_COMMANDS])

  const info = await bot.api.getWebhookInfo()

  return Response.json({
    ok: true,
    webhookUrl,
    webhookInfo: info,
  })
}
