import { webhookCallback } from 'grammy'
import { getTelegramBot, TELEGRAM_BOT_COMMANDS } from '@/lib/telegram/bot'
import {
  getTelegramBotToken,
  getTelegramWebhookSecret,
  isTelegramBotConfigured,
} from '@/lib/telegram/config'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isTelegramBotConfigured()) {
    return new Response('Telegram bot not configured', { status: 503 })
  }

  const bot = getTelegramBot()
  if (!bot) {
    return new Response('Telegram bot not configured', { status: 503 })
  }

  const secret = getTelegramWebhookSecret()
  const handleUpdate = webhookCallback(bot, 'std/http', {
    secretToken: secret ?? undefined,
  })

  try {
    return await handleUpdate(request)
  } catch (e) {
    console.error('Telegram webhook failed', e)
    return new Response('Webhook handler failed', { status: 500 })
  }
}

/** Health / config check (no secrets). */
export async function GET() {
  return Response.json({
    configured: isTelegramBotConfigured(),
    commands: TELEGRAM_BOT_COMMANDS.map((c) => c.command),
    tokenPresent: Boolean(getTelegramBotToken()),
  })
}
