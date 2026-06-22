import { utcIsoToLocalDateTimeInput } from './datetime'

export type SessionFormInitial = {
  title: string
  locationId: string
  startsAtLocal: string
  timezone: string
  durationMin: number
  capacity: number | null
  minPlayers: number | null
}

type SessionFormEvent = {
  title: string | null
  location_id: string
  starts_at: string
  timezone: string
  duration_min: number
  capacity: number | null
  min_players: number | null
}

export function sessionFormInitialFromEvent(event: SessionFormEvent): SessionFormInitial {
  return {
    title: event.title?.trim() || 'Session',
    locationId: event.location_id,
    startsAtLocal: utcIsoToLocalDateTimeInput(event.starts_at, event.timezone),
    timezone: event.timezone,
    durationMin: event.duration_min,
    capacity: event.capacity,
    minPlayers: event.min_players,
  }
}
