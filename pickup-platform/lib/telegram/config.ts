/** Telegram bot env + feature gate helpers. */

export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  return token || null
}

export function getTelegramWebhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  return secret || null
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(getTelegramBotToken())
}

/** Bot username without @ — optional, used in deep links /setup docs. */
export function getTelegramBotUsername(): string | null {
  const name = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '')
  return name || null
}
