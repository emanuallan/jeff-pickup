import { eventDisplayName, formatEventWhenLine, type EventWithLocation } from '@/lib/events'
import { buildEventShareText } from '@/lib/public-share-text'
import { orgPublicEventHref } from '@/lib/org-public-nav'
import { orgBaseUrl } from '@/lib/site-url'
import { arrivalStatusEmoji, arrivalStatusLabel } from '@/lib/arrival-status'

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
    'Link your Organizr account first.',
    '',
    'RETURNING PLAYERS: OPEN THIS LINK IN YOUR PHONE BROWSER (PRESS AND HOLD THE LINK → OPEN IN BROWSER / SAFARI / CHROME). DO NOT USE TELEGRAM\'S IN-APP BROWSER IF YOU WANT YOUR SAVED PROFILE PREFILLED.',
    '',
    'Open this private link (expires in 30 minutes):',
    pairUrl,
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
    'Players: send /link here to pair, then use /in /out /maybe (/in 2 for guests).',
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

export function formatRosterMessage(opts: {
  event: EventWithLocation
  roster: Array<{ display_name: string; guest_count: number; arrival_status: string }>
  waitlist: Array<{ display_name: string; guest_count: number; arrival_status: string }>
  headcount: number
}): string {
  const { event, roster, waitlist, headcount } = opts
  const session = eventDisplayName(event.title)
  const when = formatEventWhenLine(event)
  const isOnline = Boolean(event.location_is_online)

  const lines = [
    `${session} · ${when}`,
    formatCountMessage(headcount),
    '',
  ]

  if (roster.length === 0 && waitlist.length === 0) {
    lines.push('No one signed up yet.')
    return lines.join('\n')
  }

  for (const entry of roster) {
    lines.push(formatRosterLine(entry, isOnline))
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
