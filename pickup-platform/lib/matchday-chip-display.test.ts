import { describe, expect, it } from 'vitest'
import { buildMatchdayChipDisplays } from './matchday-chip-display'

describe('matchday-chip-display', () => {
  it('shows weekday when only one event per day', () => {
    const chips = buildMatchdayChipDisplays([
      {
        short_id: 'a',
        starts_at: '2026-07-10T22:00:00.000Z',
        timezone: 'America/New_York',
        status: 'on',
      },
    ])

    expect(chips[0]?.showTime).toBe(false)
    expect(chips[0]?.bottomLabel).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)
  })

  it('shows time when multiple events share a calendar day', () => {
    const chips = buildMatchdayChipDisplays([
      {
        short_id: 'a',
        starts_at: '2026-07-10T22:00:00.000Z',
        timezone: 'America/New_York',
        status: 'on',
      },
      {
        short_id: 'b',
        starts_at: '2026-07-11T01:00:00.000Z',
        timezone: 'America/New_York',
        status: 'on',
      },
    ])

    expect(chips.every((chip) => chip.showTime)).toBe(true)
    expect(chips[0]?.bottomLabel).toMatch(/am|pm/)
  })

  it('marks cancelled and past sessions in aria labels', () => {
    const chips = buildMatchdayChipDisplays([
      {
        short_id: 'cancelled',
        starts_at: '2026-07-10T22:00:00.000Z',
        timezone: 'America/New_York',
        status: 'cancelled',
      },
      {
        short_id: 'past',
        starts_at: '2026-06-01T22:00:00.000Z',
        timezone: 'America/New_York',
        status: 'on',
        pastReference: true,
      },
    ])

    expect(chips[0]?.cancelled).toBe(true)
    expect(chips[0]?.ariaLabel).toContain('cancelled session')
    expect(chips[1]?.pastReference).toBe(true)
    expect(chips[1]?.bottomLabel).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)
    expect(chips[1]?.ariaLabel).toContain('past session')
  })
})
