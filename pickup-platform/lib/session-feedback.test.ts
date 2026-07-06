import { describe, expect, it } from 'vitest'
import {
  buildSessionFeedbackSummary,
  formatAverageRating,
  sessionFeedbackCommentRequired,
  sessionFeedbackCommentVisible,
  validateSessionFeedbackInput,
} from './session-feedback'

describe('session-feedback', () => {
  describe('validateSessionFeedbackInput', () => {
    it('accepts ratings without comments when above 2 stars', () => {
      expect(validateSessionFeedbackInput(5, '')).toEqual({ ok: true })
      expect(validateSessionFeedbackInput(3, '')).toEqual({ ok: true })
    })

    it('requires comments for ratings of 2 or lower', () => {
      expect(validateSessionFeedbackInput(2, '')).toEqual({
        ok: false,
        error: 'Please share a short comment for ratings of 2 or lower.',
      })
      expect(validateSessionFeedbackInput(1, '  ')).toEqual({
        ok: false,
        error: 'Please share a short comment for ratings of 2 or lower.',
      })
      expect(validateSessionFeedbackInput(2, 'Too crowded')).toEqual({ ok: true })
    })

    it('rejects invalid ratings', () => {
      expect(validateSessionFeedbackInput(0, '')).toEqual({
        ok: false,
        error: 'Choose a rating between 1 and 5 stars.',
      })
      expect(validateSessionFeedbackInput(6, '')).toEqual({
        ok: false,
        error: 'Choose a rating between 1 and 5 stars.',
      })
    })
  })

  describe('comment visibility helpers', () => {
    it('shows comments below 5 stars', () => {
      expect(sessionFeedbackCommentVisible(4)).toBe(true)
      expect(sessionFeedbackCommentVisible(5)).toBe(false)
      expect(sessionFeedbackCommentVisible(null)).toBe(false)
    })

    it('requires comments at 2 stars or lower', () => {
      expect(sessionFeedbackCommentRequired(2)).toBe(true)
      expect(sessionFeedbackCommentRequired(3)).toBe(false)
    })
  })

  describe('buildSessionFeedbackSummary', () => {
    it('computes averages from rated responses only', () => {
      const summary = buildSessionFeedbackSummary([
        { outcome: 'rated', rating: 4 },
        { outcome: 'rated', rating: 2 },
        { outcome: 'no_attend', rating: null },
      ])

      expect(summary).toEqual({
        ratedCount: 2,
        noAttendCount: 1,
        averageRating: 3,
      })
      expect(formatAverageRating(summary.averageRating)).toBe('3.0')
    })
  })
})
