import { describe, expect, it } from 'vitest'
import { isStructuralScheduleChange, type Schedule } from './schedules'

describe('schedules', () => {
  const baseSchedule: Pick<
    Schedule,
    'byweekday' | 'start_time' | 'interval_weeks' | 'timezone'
  > = {
    byweekday: [2, 4],
    start_time: '18:00:00',
    interval_weeks: 1,
    timezone: 'America/New_York',
  }

  it('returns false when weekday order differs but days are the same', () => {
    expect(
      isStructuralScheduleChange(baseSchedule, {
        byweekday: [4, 2],
        startTime: '18:00',
        intervalWeeks: 1,
        timezone: 'America/New_York',
      }),
    ).toBe(false)
  })

  it('detects weekday changes', () => {
    expect(
      isStructuralScheduleChange(baseSchedule, {
        byweekday: [2, 5],
        startTime: '18:00',
        intervalWeeks: 1,
        timezone: 'America/New_York',
      }),
    ).toBe(true)
  })

  it('detects start time changes', () => {
    expect(
      isStructuralScheduleChange(baseSchedule, {
        byweekday: [2, 4],
        startTime: '19:00',
        intervalWeeks: 1,
        timezone: 'America/New_York',
      }),
    ).toBe(true)
  })

  it('detects interval and timezone changes', () => {
    expect(
      isStructuralScheduleChange(baseSchedule, {
        byweekday: [2, 4],
        startTime: '18:00',
        intervalWeeks: 2,
        timezone: 'America/New_York',
      }),
    ).toBe(true)

    expect(
      isStructuralScheduleChange(baseSchedule, {
        byweekday: [2, 4],
        startTime: '18:00',
        intervalWeeks: 1,
        timezone: 'America/Los_Angeles',
      }),
    ).toBe(true)
  })
})
