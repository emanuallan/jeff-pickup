type ChipEventInput = {
  short_id: string
  starts_at: string
  timezone: string
  status: string
  pastReference?: boolean
}

export type MatchdayChipDisplay = {
  shortId: string
  month: string
  day: string
  bottomLabel: string
  cancelled: boolean
  pastReference: boolean
  showTime: boolean
  ariaLabel: string
}

function dayKey(event: ChipEventInput): string {
  return new Date(event.starts_at).toLocaleDateString('en-CA', {
    timeZone: event.timezone || 'UTC',
  })
}

function duplicateDayKeys(events: ChipEventInput[]): Set<string> {
  const counts = new Map<string, number>()
  for (const event of events) {
    const key = dayKey(event)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  )
}

function chipParts(event: ChipEventInput) {
  const zone = event.timezone || 'UTC'
  const d = new Date(event.starts_at)
  const time = d
    .toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: zone,
    })
    .replace(' AM', 'am')
    .replace(' PM', 'pm')
  return {
    month: d.toLocaleString('en-US', { month: 'short', timeZone: zone }),
    day: d.toLocaleString('en-US', { day: 'numeric', timeZone: zone }),
    weekday: d.toLocaleString('en-US', { weekday: 'short', timeZone: zone }),
    time,
  }
}

/** Precompute chip labels on the server so client presses stay lightweight. */
export function buildMatchdayChipDisplays(events: ChipEventInput[]): MatchdayChipDisplay[] {
  const sharedDays = duplicateDayKeys(events)

  return events.map((event) => {
    const cancelled = event.status === 'cancelled'
    const pastReference = event.pastReference === true
    const { month, day, weekday, time } = chipParts(event)
    const showTime = sharedDays.has(dayKey(event))
    const bottomLabel = showTime ? time : weekday

    const ariaLabel = pastReference
      ? `${month} ${day}${showTime ? `, ${time}` : ''}, past session`
      : cancelled
        ? `${month} ${day}${showTime ? `, ${time}` : ''}, cancelled session`
        : `${month} ${day}, ${showTime ? time : weekday}`

    return {
      shortId: event.short_id,
      month,
      day,
      bottomLabel,
      cancelled,
      pastReference,
      showTime,
      ariaLabel,
    }
  })
}
