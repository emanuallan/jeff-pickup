import { Bot, GrammyError } from 'grammy'
import { getTelegramBotToken, getTelegramBotUsername } from '@/lib/telegram/config'
import { formatGroupLinkedMessage } from '@/lib/telegram/messages'
import { redeemConnectCode } from '@/lib/telegram/links'
import {
  handleTelegramArrivalStatus,
  handleTelegramCount,
  handleTelegramLinkPrompt,
  handleTelegramNext,
  handleTelegramRoster,
  handleTelegramRsvp,
} from '@/lib/telegram/rsvp'

let botSingleton: Bot | null = null

function usernameOf(ctx: { from?: { username?: string } }): string | null {
  return ctx.from?.username ?? null
}

async function replyLinkResult(
  ctx: {
    from?: { id: number }
    reply: (text: string) => Promise<unknown>
    api: { sendMessage: (chatId: number, text: string) => Promise<unknown> }
  },
  result: { ok: boolean; message: string; pairViaDm?: boolean },
  preferDm: boolean,
) {
  if (preferDm && result.pairViaDm && ctx.from) {
    try {
      await ctx.api.sendMessage(ctx.from.id, result.message)
      await ctx.reply('I sent you a private pairing link — check your DM with me.')
      return
    } catch {
      await ctx.reply(
        "I couldn't message you privately. Open a DM with me first, then send /link here.",
      )
      return
    }
  }

  await ctx.reply(result.message)
}

export function createTelegramBot(): Bot | null {
  const token = getTelegramBotToken()
  if (!token) return null

  const bot = new Bot(token)

  bot.command('start', async (ctx) => {
    const botName = getTelegramBotUsername()
    await ctx.reply(
      [
        'Organizr bot — RSVP from Telegram.',
        '',
        'Organizers: generate a connect code in the console, add me to your group, then /connect CODE.',
        'Players: in your linked group, /link then /in /out /maybe /omw /late.',
        'Anyone: /next · /roster · /count.',
        botName ? `Bot: @${botName}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  })

  bot.command('connect', async (ctx) => {
    const code = ctx.match?.trim()
    if (!code) {
      await ctx.reply('Usage: /connect CODE (from your Organizr console).')
      return
    }

    const chat = ctx.chat
    if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
      await ctx.reply('Run /connect inside the Telegram group you want to link.')
      return
    }

    if (ctx.from) {
      try {
        const member = await ctx.getChatMember(ctx.from.id)
        if (member.status !== 'creator' && member.status !== 'administrator') {
          await ctx.reply('Only a group admin can connect this chat.')
          return
        }
      } catch {
        // Code remains the real auth.
      }
    }

    try {
      const result = await redeemConnectCode({
        code,
        chatId: chat.id,
        chatTitle: 'title' in chat ? chat.title ?? null : null,
      })
      await ctx.reply(formatGroupLinkedMessage(result.org_name, result.org_slug))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not connect'
      await ctx.reply(message)
    }
  })

  bot.command('link', async (ctx) => {
    const chat = ctx.chat
    if (!chat || !ctx.from) {
      await ctx.reply('Could not read this chat.')
      return
    }

    const isPrivate = chat.type === 'private'
    const result = await handleTelegramLinkPrompt({
      chatId: chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      isPrivateChat: isPrivate,
    })

    await replyLinkResult(ctx, result, !isPrivate)
  })

  bot.command('in', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /in inside your linked group chat.')
      return
    }
    const result = await handleTelegramRsvp({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      action: 'in',
      guestCountArg: ctx.match,
    })
    await replyLinkResult(ctx, result, true)
  })

  bot.command('out', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /out inside your linked group chat.')
      return
    }
    const result = await handleTelegramRsvp({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      action: 'out',
    })
    await replyLinkResult(ctx, result, true)
  })

  bot.command('maybe', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /maybe inside your linked group chat.')
      return
    }
    const result = await handleTelegramRsvp({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      action: 'maybe',
    })
    await replyLinkResult(ctx, result, true)
  })

  bot.command('omw', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /omw inside your linked group chat.')
      return
    }
    const result = await handleTelegramArrivalStatus({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      action: 'omw',
    })
    await replyLinkResult(ctx, result, true)
  })

  bot.command('late', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /late inside your linked group chat.')
      return
    }
    const result = await handleTelegramArrivalStatus({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      action: 'late',
    })
    await replyLinkResult(ctx, result, true)
  })

  bot.command('next', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use /next inside your linked group chat.')
      return
    }
    const result = await handleTelegramNext(ctx.chat.id)
    await ctx.reply(result.message)
  })

  bot.command('roster', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use /roster inside your linked group chat.')
      return
    }
    const result = await handleTelegramRoster(ctx.chat.id)
    await ctx.reply(result.message)
  })

  bot.command('count', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use /count inside your linked group chat.')
      return
    }
    const result = await handleTelegramCount(ctx.chat.id)
    await ctx.reply(result.message)
  })

  bot.catch((err) => {
    const e = err.error
    if (e instanceof GrammyError) {
      console.error('Telegram Grammy error', e.description)
    } else {
      console.error('Telegram bot error', e)
    }
  })

  return bot
}

export function getTelegramBot(): Bot | null {
  if (botSingleton) return botSingleton
  botSingleton = createTelegramBot()
  return botSingleton
}

/** BotFather / setMyCommands list. */
export const TELEGRAM_BOT_COMMANDS = [
  { command: 'start', description: 'Help and intro' },
  { command: 'connect', description: 'Link this group with a console code' },
  { command: 'link', description: 'Pair your Telegram with Organizr' },
  { command: 'in', description: 'RSVP in (/in 2 brings 2 guests)' },
  { command: 'out', description: 'Leave the next session' },
  { command: 'maybe', description: 'Mark maybe for the next session' },
  { command: 'omw', description: 'Mark on my way' },
  { command: 'late', description: 'Mark running late' },
  { command: 'next', description: 'Show the next session' },
  { command: 'roster', description: 'List signups for the next session' },
  { command: 'count', description: 'Headcount for the next session' },
] as const
