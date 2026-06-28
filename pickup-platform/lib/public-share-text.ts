import {
  eventDisplayName,
  formatEventWhenLine,
  type EventWithLocation,
} from '@/lib/events'

type EventLocationFields = Pick<
  EventWithLocation,
  'location_label' | 'location_is_online'
>

function formatShareLocation(event: EventLocationFields): string {
  const label = event.location_label?.trim()
  if (event.location_is_online) {
    return label ? ` on ${label}` : ' online'
  }
  return label ? ` at ${label}` : ''
}

/** Clipboard / Web Share body for a single session page. */
export function buildEventShareText(orgName: string, event: EventWithLocation): string {
  const session = eventDisplayName(event.title)
  const when = formatEventWhenLine(event)
  const where = formatShareLocation(event)
  return `Join us for ${session} with ${orgName} — ${when}${where}. Tap to sign up and see who's coming:`
}

/** Native share title for a single session page. */
export function buildEventShareTitle(orgName: string, event: Pick<EventWithLocation, 'title'>): string {
  return `${eventDisplayName(event.title)} · ${orgName}`
}

/** Clipboard / Web Share body for the org calendar page. */
export function buildOrgCalendarShareText(
  orgName: string,
  nextEvent?: EventWithLocation | null,
): string {
  if (nextEvent) {
    const session = eventDisplayName(nextEvent.title)
    const when = formatEventWhenLine(nextEvent)
    const where = formatShareLocation(nextEvent)
    return `You're invited — ${session} with ${orgName}, ${when}${where}. See the roster and sign up:`
  }

  return `See upcoming sessions with ${orgName} and join the roster:`
}

/** Native share title for the org calendar page. */
export function buildOrgCalendarShareTitle(
  orgName: string,
  nextEvent?: Pick<EventWithLocation, 'title'> | null,
): string {
  if (nextEvent) {
    return `${eventDisplayName(nextEvent.title)} · ${orgName}`
  }

  return `${orgName} — Calendar`
}
