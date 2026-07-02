import { localDateTimeInZoneToUtcIso, utcIsoToLocalDateTimeInput } from './datetime'

/** datetime-local value for the next whole hour (e.g. 3:22pm → today 4:00pm). */
export function defaultOneOffStartsAtLocal(): string {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`
}

/** Shift a datetime-local value by minutes in an IANA timezone (DST-safe). */
export function addMinutesToLocalDateTime(
  localDateTime: string,
  minutes: number,
  timeZone: string,
): string {
  const iso = localDateTimeInZoneToUtcIso(localDateTime, timeZone)
  const shifted = new Date(new Date(iso).getTime() + minutes * 60_000)
  return utcIsoToLocalDateTimeInput(shifted.toISOString(), timeZone)
}

/** Minutes between two datetime-local values in an IANA timezone. */
export function durationMinFromLocalRange(
  startLocal: string,
  endLocal: string,
  timeZone: string,
): number {
  const startMs = new Date(localDateTimeInZoneToUtcIso(startLocal, timeZone)).getTime()
  const endMs = new Date(localDateTimeInZoneToUtcIso(endLocal, timeZone)).getTime()
  return Math.round((endMs - startMs) / 60_000)
}
