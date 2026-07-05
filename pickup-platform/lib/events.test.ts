import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canUpdateArrivalStatus,
  formatEventDayLabel,
  initialEventStatus,
  isEventCancelled,
  isEventEnded,
  isEventInProgress,
  isEventStarted,
  pickFeaturedUpcomingEvent,
} from './events'
import { makeEvent, makeEventWithLocation } from '@/test/fixtures/events'

describe('events', () => {
  describe('initialEventStatus', () => {
    it('returns on when no minimum players', () => {
      expect(initialEventStatus(null)).toBe('on')
      expect(initialEventStatus(undefined)).toBe('on')
    })

    it('returns tentative when minimum players is set', () => {
      expect(initialEventStatus(8)).toBe('tentative')
    })
  })

  describe('isEventCancelled', () => {
    it('detects cancelled status', () => {
      expect(isEventCancelled('cancelled')).toBe(true)
      expect(isEventCancelled('on')).toBe(false)
    })
  })

  describe('pickFeaturedUpcomingEvent', () => {
    it('skips cancelled events', () => {
      const events = [
        makeEventWithLocation({ short_id: 'a', status: 'cancelled' }),
        makeEventWithLocation({ short_id: 'b', status: 'on' }),
      ]
      expect(pickFeaturedUpcomingEvent(events)?.short_id).toBe('b')
    })

    it('returns null when all events are cancelled', () => {
      const events = [makeEventWithLocation({ status: 'cancelled' })]
      expect(pickFeaturedUpcomingEvent(events)).toBeNull()
    })
  })

  describe('event lifecycle', () => {
    const event = makeEvent({
      starts_at: '2026-07-10T22:00:00.000Z',
      duration_min: 90,
    })

    it('is not started before start time', () => {
      const now = new Date('2026-07-10T21:00:00.000Z')
      expect(isEventStarted(event, now)).toBe(false)
      expect(isEventInProgress(event, now)).toBe(false)
      expect(isEventEnded(event, now)).toBe(false)
      expect(canUpdateArrivalStatus(event, now)).toBe(true)
    })

    it('is in progress between start and end', () => {
      const now = new Date('2026-07-10T22:30:00.000Z')
      expect(isEventStarted(event, now)).toBe(true)
      expect(isEventInProgress(event, now)).toBe(true)
      expect(isEventEnded(event, now)).toBe(false)
      expect(canUpdateArrivalStatus(event, now)).toBe(true)
    })

    it('is ended after duration elapses', () => {
      const now = new Date('2026-07-10T23:31:00.000Z')
      expect(isEventEnded(event, now)).toBe(true)
      expect(isEventInProgress(event, now)).toBe(false)
      expect(canUpdateArrivalStatus(event, now)).toBe(false)
    })
  })

  describe('formatEventDayLabel', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-10T14:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns Today for same calendar day in event timezone', () => {
      const event = makeEvent({
        starts_at: '2026-07-10T22:00:00.000Z',
        timezone: 'America/New_York',
      })
      expect(formatEventDayLabel(event)).toBe('Today')
    })

    it('returns Tomorrow for next calendar day in event timezone', () => {
      const event = makeEvent({
        starts_at: '2026-07-11T22:00:00.000Z',
        timezone: 'America/New_York',
      })
      expect(formatEventDayLabel(event)).toBe('Tomorrow')
    })
  })
})
