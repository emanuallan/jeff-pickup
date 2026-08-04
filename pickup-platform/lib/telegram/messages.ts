import { eventDisplayName, formatEventWhenLine, type EventWithLocation } from '@/lib/events'
import { buildEventShareText } from '@/lib/public-share-text'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { orgBaseUrl } from '@/lib/site-url'
import { arrivalStatusEmoji, arrivalStatusLabel } from '@/lib/arrival-status'
import {
  sessionTeamLabel,
  splitRosterByTeam,
  teamHeadcount,
  type SessionTeamOrUnassigned,
} from '@/lib/session-team'

export function publicEventUrl(orgSlug: string, shortId: string): string {
  return `${orgBaseUrl(orgSlug)}${orgPublicEventHref(shortId)}`
}

export function telegramPairUrl(orgSlug: string, token: string): string {
  return `${orgBaseUrl(orgSlug)}/telegram/pair?token=${encodeURIComponent(token)}`
}

export function formatNextSessionMessage(
  orgName: string,
  orgSlug: string,
  event: EventWithLocation,
): string {
  const share = buildEventShareText(orgName, event)
  const url = publicEventUrl(orgSlug, event.short_id)
  const announcement = event.announcement?.trim()
  const lines = [share, url]
  if (announcement) {
    lines.push('', announcement)
  }
  return lines.join('\n')
}

export function formatRsvpReply(opts: {
  displayName: string
  status: 'confirmed' | 'maybe' | 'out'
  event: EventWithLocation
  headcount: number | null
  listStatus?: string | null
  isOnline?: boolean
  guestCount?: number | null
}): string {
  const { displayName, status, event, headcount, listStatus, isOnline, guestCount } = opts
  const session = eventDisplayName(event.title)
  const when = formatEventWhenLine(event)

  if (status === 'out') {
    return `${displayName} is out for ${session} (${when}).`
  }

  const emoji = arrivalStatusEmoji(status, isOnline)
  const label = arrivalStatusLabel(status, isOnline)
  const waitlisted = listStatus === 'waitlisted'
  const guests =
    guestCount != null && guestCount > 0
      ? guestCount === 1
        ? ' (+1 guest)'
        : ` (+${guestCount} guests)`
      : ''
  const head =
    headcount != null ? ` · ${headcount} confirmed` : ''
  const wait = waitlisted ? ' (waitlisted)' : ''

  return `${emoji} ${displayName}${guests}: ${label}${wait} — ${session} (${when})${head}`
}

export function formatNeedPairMessage(pairUrl: string): string {
  return [
    'Link your Organizr account to RSVP from Telegram.',
    '',
    'Easiest: tap Share phone number below — Telegram confirms it\'s your number.',
    '',
    'Prefer the website? Open this link in Safari/Chrome (press and hold → Open in Browser). Expires in 30 minutes:',
    pairUrl,
  ].join('\n')
}

/** Deep link that opens a private chat with the bot and runs /start <payload>. */
export function telegramBotStartUrl(botUsername: string, startPayload: string): string {
  const user = botUsername.replace(/^@/, '')
  return `https://t.me/${user}?start=${encodeURIComponent(startPayload)}`
}

/** Group-chat tip when Telegram blocks the bot from DMing the user yet. */
export function formatDmBlockedPairHint(botStartUrl: string | null): string {
  if (botStartUrl) {
    return [
      "I can't message you yet (Telegram needs you to open me once).",
      '',
      'Tap here and press Start — I\'ll send your pairing options right away:',
      botStartUrl,
    ].join('\n')
  }
  return [
    "I can't message you yet (Telegram needs you to open me once).",
    'Open a chat with the bot, press Start, then send /link again in the group.',
  ].join('\n')
}

export function formatLinkIntentStartMessage(pairUrl: string): string {
  return [
    'You\'re ready to pair.',
    '',
    formatNeedPairMessage(pairUrl),
    '',
    'After you finish, go back to your group and use /in.',
  ].join('\n')
}

export function formatContactPairedMessage(displayName: string, orgName: string): string {
  return [
    `You're linked as ${displayName} for ${orgName}.`,
    '',
    'Go back to your group and send /in (or /out /maybe).',
  ].join('\n')
}

export function formatPaidSessionMessage(url: string): string {
  return [
    'This session requires payment — sign up on the web:',
    url,
  ].join('\n')
}

export function formatMvpAnnouncement(opts: {
  orgName: string
  sessionTitle: string
  when: string
  winnerNames: string[]
  eventUrl: string
}): string {
  const { orgName, sessionTitle, when, winnerNames, eventUrl } = opts
  const winners =
    winnerNames.length === 0
      ? 'No votes this time.'
      : winnerNames.length === 1
        ? `MVP: ${winnerNames[0]}`
        : `MVPs (tie): ${winnerNames.join(', ')}`

  return [
    `🏆 ${orgName} — ${sessionTitle}`,
    when,
    winners,
    eventUrl,
  ].join('\n')
}

export function formatGroupLinkedMessage(orgName: string, orgSlug: string): string {
  return [
    `Linked to ${orgName} (${orgSlug}).`,
    'Players: send /link here to pair, then use /in /out /maybe /omw /late /join N (/in 2 for guests).',
    'Anyone: /next · /roster · /count.',
  ].join('\n')
}

export function formatCountMessage(headcount: number): string {
  return `${headcount} signed up`
}

export function formatRosterLine(entry: {
  display_name: string
  guest_count: number
  arrival_status: string
}, isOnline = false): string {
  const emoji =
    entry.arrival_status === 'maybe' ? `${arrivalStatusEmoji('maybe', isOnline)} ` : ''
  const guests = entry.guest_count > 0 ? ` (+${entry.guest_count})` : ''
  return `• ${emoji}${entry.display_name}${guests}`
}

type RosterMessageEntry = {
  display_name: string
  guest_count: number
  arrival_status: string
  team?: SessionTeamOrUnassigned
}

export function formatRosterMessage(opts: {
  event: EventWithLocation
  roster: RosterMessageEntry[]
  waitlist: RosterMessageEntry[]
  headcount: number
  /** When set, group confirmed roster by team (session teams are on). */
  teamCount?: number | null
}): string {
  const { event, roster, waitlist, headcount, teamCount } = opts
  const session = eventDisplayName(event.title)
  const when = formatEventWhenLine(event)
  const isOnline = Boolean(event.location_is_online)
  const showTeams = teamCount != null && teamCount >= 2

  const lines = [
    `${session} · ${when}`,
    formatCountMessage(headcount),
    '',
  ]

  if (roster.length === 0 && waitlist.length === 0) {
    lines.push('No one signed up yet.')
    return lines.join('\n')
  }

  if (showTeams && roster.length > 0) {
    const { teams, unassigned } = splitRosterByTeam(roster, teamCount)
    for (let i = 0; i < teams.length; i++) {
      const members = teams[i]!
      const n = teamHeadcount(members)
      lines.push(`${sessionTeamLabel(i + 1)} (${n}):`)
      if (members.length === 0) {
        lines.push('• —')
      } else {
        for (const entry of members) {
          lines.push(formatRosterLine(entry, isOnline))
        }
      }
      lines.push('')
    }
    if (unassigned.length > 0) {
      lines.push(`${sessionTeamLabel(null)} (${teamHeadcount(unassigned)}):`)
      for (const entry of unassigned) {
        lines.push(formatRosterLine(entry, isOnline))
      }
      lines.push('')
    }
    // Drop trailing blank from the last team block before waitlist.
    if (lines[lines.length - 1] === '') lines.pop()
  } else {
    for (const entry of roster) {
      lines.push(formatRosterLine(entry, isOnline))
    }
  }

  if (waitlist.length > 0) {
    lines.push('', `Waitlist (${waitlist.length}):`)
    for (const entry of waitlist) {
      lines.push(formatRosterLine(entry, isOnline))
    }
  }

  // Telegram messages max out at 4096 characters.
  const text = lines.join('\n')
  if (text.length <= 4000) return text
  return `${text.slice(0, 3950)}\n… (truncated)`
}
