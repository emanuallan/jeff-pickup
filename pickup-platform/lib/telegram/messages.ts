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
}): string {
  const { displayName, status, event, headcount, listStatus, isOnline } = opts
  const session = eventDisplayName(event.title)
  const when = formatEventWhenLine(event)

  if (status === 'out') {
    return `${displayName} is out for ${session} (${when}).`
  }

  const emoji = arrivalStatusEmoji(status, isOnline)
  const label = arrivalStatusLabel(status, isOnline)
  const waitlisted = listStatus === 'waitlisted'
  const head =
    headcount != null ? ` · ${headcount} confirmed` : ''
  const wait = waitlisted ? ' (waitlisted)' : ''

  return `${emoji} ${displayName}: ${label}${wait} — ${session} (${when})${head}`
}

export function formatNeedPairMessage(pairUrl: string): string {
  return [
    'Link your Organizr account first.',
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
    'Players: send /link here to pair, then use /in /out /maybe.',
    'Anyone: /next for the upcoming session.',
  ].join('\n')
}
