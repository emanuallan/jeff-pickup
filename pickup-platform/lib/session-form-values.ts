import { utcIsoToLocalDateTimeInput } from './datetime'
import { addMinutesToLocalDateTime } from './one-off-datetime'

export type SessionFormInitial = {
  title: string
  locationId: string
  startsAtLocal: string
  endsAtLocal: string
  timezone: string
  durationMin: number
  capacity: number | null
  minPlayers: number | null
  additionalInformation: string
}

type SessionFormEvent = {
  title: string | null
  location_id: string
  starts_at: string
  timezone: string
  duration_min: number
  capacity: number | null
  min_players: number | null
  additional_information: string
}

export function sessionFormInitialFromEvent(event: SessionFormEvent): SessionFormInitial {
  const startsAtLocal = utcIsoToLocalDateTimeInput(event.starts_at, event.timezone)
  return {
    title: event.title?.trim() || 'Session',
    locationId: event.location_id,
    startsAtLocal,
    endsAtLocal: addMinutesToLocalDateTime(
      startsAtLocal,
      event.duration_min,
      event.timezone,
    ),
    timezone: event.timezone,
    durationMin: event.duration_min,
    capacity: event.capacity,
    minPlayers: event.min_players,
    additionalInformation: event.additional_information,
  }
}
