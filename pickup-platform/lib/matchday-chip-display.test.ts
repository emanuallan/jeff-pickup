import { describe, expect, it } from 'vitest'
import { buildMatchdayChipDisplays, mergeMatchdayChipRail } from './matchday-chip-display'

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

describe('mergeMatchdayChipRail', () => {
  const isEnded = (event: { short_id: string; ended?: boolean }) => event.ended === true

  it('prefixes past chips and appends temporary far-future suffixes', () => {
    const rail = mergeMatchdayChipRail({
      prefix: [{ short_id: 'past' }],
      upcoming: [{ short_id: 'soon' }, { short_id: 'next' }],
      suffix: [{ short_id: 'far' }],
      isEnded,
    })

    expect(rail.map((e) => e.short_id)).toEqual(['past', 'soon', 'next', 'far'])
  })

  it('drops suffix chips already present in the upcoming window', () => {
    const rail = mergeMatchdayChipRail({
      prefix: [{ short_id: 'past' }],
      upcoming: [{ short_id: 'soon' }],
      suffix: [{ short_id: 'soon' }, { short_id: 'far' }],
      isEnded,
    })

    expect(rail.map((e) => e.short_id)).toEqual(['past', 'soon', 'far'])
  })

  it('omits ended upcoming events from the rail body', () => {
    const rail = mergeMatchdayChipRail({
      prefix: [],
      upcoming: [
        { short_id: 'live' },
        { short_id: 'ended', ended: true },
      ],
      suffix: [],
      isEnded,
    })

    expect(rail.map((e) => e.short_id)).toEqual(['live'])
  })
})
