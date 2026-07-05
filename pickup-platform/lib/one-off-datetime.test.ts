import { describe, expect, it } from 'vitest'
import {
  addMinutesToLocalDateTime,
  durationMinFromLocalRange,
} from './one-off-datetime'

describe('one-off-datetime', () => {
  const zone = 'America/New_York'

  it('adds minutes within the same local day', () => {
    const start = '2026-07-15T18:00'
    expect(addMinutesToLocalDateTime(start, 90, zone)).toBe('2026-07-15T19:30')
  })

  it('computes duration between two local datetimes', () => {
    expect(
      durationMinFromLocalRange('2026-07-15T18:00', '2026-07-15T19:30', zone),
    ).toBe(90)
  })

  it('crosses midnight when adding minutes', () => {
    const start = '2026-07-15T23:30'
    expect(addMinutesToLocalDateTime(start, 60, zone)).toBe('2026-07-16T00:30')
  })
})
