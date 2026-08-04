import { Bot, GrammyError, InlineKeyboard, Keyboard } from 'grammy'
import { getTelegramBotToken, getTelegramBotUsername } from '@/lib/telegram/config'
import { handleTelegramContactPair } from '@/lib/telegram/contact-pair'
import {
  formatDmBlockedPairHint,
  formatGroupLinkedMessage,
  formatWebsitePairHint,
  telegramBotStartUrl,
} from '@/lib/telegram/messages'
import { createLinkIntent, redeemConnectCode } from '@/lib/telegram/links'
import {
  handleTelegramArrivalStatus,
  handleTelegramCount,
  handleTelegramJoinTeam,
  handleTelegramLinkPrompt,
  handleTelegramNext,
  handleTelegramRoster,
  handleTelegramRsvp,
  handleTelegramStartLinkIntent,
  handleTelegramStartPairPayload,
} from '@/lib/telegram/rsvp'

let botSingleton: Bot | null = null

function usernameOf(ctx: { from?: { username?: string } }): string | null {
  return ctx.from?.username ?? null
}

function pairUrlKeyboard(pairUrl: string): InlineKeyboard {
  return new InlineKeyboard().url('Open website pairing link', pairUrl)
}

function contactShareKeyboard(): Keyboard {
  return new Keyboard().requestContact('Share phone number').resized().oneTime()
}

const noLinkPreview = { link_preview_options: { is_disabled: true } }

async function sendPairDm(
  api: {
    sendMessage: (chatId: number, text: string, other?: object) => Promise<unknown>
  },
  userId: number,
  message: string,
  pairUrl?: string | null,
) {
  if (pairUrl) {
    await api.sendMessage(userId, message, {
      reply_markup: contactShareKeyboard(),
      ...noLinkPreview,
    })
    await api.sendMessage(userId, formatWebsitePairHint(), {
      reply_markup: pairUrlKeyboard(pairUrl),
      ...noLinkPreview,
    })
    return
  }
  await api.sendMessage(userId, message, noLinkPreview)
}

async function replyPairPrompt(
  ctx: {
    reply: (text: string, other?: object) => Promise<unknown>
  },
  message: string,
  pairUrl: string,
) {
  await ctx.reply(message, {
    reply_markup: contactShareKeyboard(),
    ...noLinkPreview,
  })
  await ctx.reply(formatWebsitePairHint(), {
    reply_markup: pairUrlKeyboard(pairUrl),
    ...noLinkPreview,
  })
}

async function replyLinkResult(
  ctx: {
    from?: { id: number; username?: string }
    reply: (text: string, other?: object) => Promise<unknown>
    api: { sendMessage: (chatId: number, text: string, other?: object) => Promise<unknown> }
  },
  result: {
    ok: boolean
    message: string
    pairViaDm?: boolean
    pairToken?: string
    pairUrl?: string
    orgId?: string
  },
  preferDm: boolean,
) {
  if (preferDm && result.pairViaDm && ctx.from) {
    try {
      await sendPairDm(ctx.api, ctx.from.id, result.message, result.pairUrl)
      await ctx.reply('I sent you a private pairing message — check your DM with me.')
      return
    } catch {
      const botName = getTelegramBotUsername()
      let startUrl: string | null = botName ? telegramBotStartUrl(botName, 'link') : null

      // Prefer an opaque intent id so /start can DM pairing options without a second /link.
      if (botName && result.orgId && result.pairToken) {
        try {
          const intent = await createLinkIntent({
            orgId: result.orgId,
            telegramUserId: ctx.from.id,
            telegramUsername: usernameOf(ctx),
            pairToken: result.pairToken,
          })
          startUrl = telegramBotStartUrl(botName, `i_${intent.id}`)
        } catch (e) {
          console.error(
            'telegram createLinkIntent failed',
            e instanceof Error ? e.message : e,
          )
        }
      }

      await ctx.reply(formatDmBlockedPairHint(startUrl))
      return
    }
  }

  if (result.pairUrl && result.ok) {
    await replyPairPrompt(ctx, result.message, result.pairUrl)
    return
  }

  await ctx.reply(result.message)
}

export function createTelegramBot(): Bot | null {
  const token = getTelegramBotToken()
  if (!token) return null

  const bot = new Bot(token)

  bot.command('start', async (ctx) => {
    const payload = ctx.match?.trim()

    if (payload && ctx.from) {
      const intentResult = await handleTelegramStartLinkIntent(payload, ctx.from.id)
      if (intentResult) {
        if (intentResult.ok && intentResult.pairUrl) {
          await replyPairPrompt(ctx, intentResult.message, intentResult.pairUrl)
        } else {
          await ctx.reply(intentResult.message)
        }
        return
      }

      const pairResult = await handleTelegramStartPairPayload(payload, ctx.from.id)
      if (pairResult) {
        if (pairResult.ok && pairResult.pairUrl) {
          await replyPairPrompt(ctx, pairResult.message, pairResult.pairUrl)
        } else {
          await ctx.reply(pairResult.message)
        }
        return
      }
    }

    // Legacy tip without intent id — user still needs to /link once in the group.
    if (payload === 'link') {
      await ctx.reply(
        'Thanks — I can message you now. Go back to your group and send /link (or /in) once more.',
      )
      return
    }

    const botName = getTelegramBotUsername()
    await ctx.reply(
      [
        'Organizr bot — RSVP from Telegram.',
        '',
        'Organizers: generate a connect code in the console, add me to your group, then /connect CODE.',
        'Players: in your linked group, /link then /in /out /maybe /omw /late /join.',
        'Anyone: /next · /roster · /count.',
        botName ? `Bot: @${botName}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  })

  bot.on('message:contact', async (ctx) => {
    if (!ctx.from || !ctx.chat || ctx.chat.type !== 'private') {
      await ctx.reply('Share your phone in a private chat with the bot.')
      return
    }

    const contact = ctx.message.contact
    const result = await handleTelegramContactPair({
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      fromFirstName: ctx.from.first_name,
      fromLastName: ctx.from.last_name,
      contact: {
        phone_number: contact.phone_number,
        first_name: contact.first_name,
        last_name: contact.last_name,
        user_id: contact.user_id,
      },
    })

    await ctx.reply(result.message, {
      reply_markup: { remove_keyboard: true },
    })
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

  bot.command('join', async (ctx) => {
    if (!ctx.from || !ctx.chat) return
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use /join inside your linked group chat.')
      return
    }
    const result = await handleTelegramJoinTeam({
      chatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      telegramUsername: usernameOf(ctx),
      teamArg: ctx.match,
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
  { command: 'join', description: 'Join a team (/join 2)' },
  { command: 'next', description: 'Show the next session' },
  { command: 'roster', description: 'List signups for the next session' },
  { command: 'count', description: 'Headcount for the next session' },
] as const
