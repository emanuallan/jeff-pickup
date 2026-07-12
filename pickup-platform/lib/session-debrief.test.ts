import { describe, expect, it } from 'vitest'
import {
  debriefStepCount,
  debriefStepIndex,
  isMvpWizardStepPending,
  isFirstDebriefStep,
  nextDebriefStep,
  parseSessionDebriefState,
  resolveInitialDebriefStep,
  shouldShowDebriefStepIndicator,
  validateSessionPlayerStatsInput,
  type SessionDebriefState,
  type SessionDebriefStep,
} from './session-debrief'

describe('session-debrief', () => {
  const baseState: SessionDebriefState = {
    mvp_voting_enabled: true,
    player_stats_enabled: true,
    feedback_enabled: true,
    mvp_voting_open: true,
    mvp_vote_cast: false,
    mvp_nominee_participant_id: null,
    mvp_skipped: false,
    mvp_step_complete: false,
    stats_submitted: false,
    stats_skipped: false,
    stats_step_complete: false,
    feedback_submitted: false,
    feedback_skipped: false,
    feedback_step_complete: false,
    debrief_complete: false,
    initial_step: 'mvp',
    steps: ['mvp', 'stats', 'feedback'],
    ballot: [{ participant_id: 'p2', display_name: 'Alex' }],
  }

  describe('parseSessionDebriefState', () => {
    it('parses RPC payload', () => {
      const state = parseSessionDebriefState({
        ...baseState,
        steps: ['mvp', 'feedback'],
        ballot: [{ participant_id: 'p2', display_name: 'Alex' }],
      })

      expect(state).toMatchObject({
        mvp_voting_open: true,
        steps: ['mvp', 'feedback'],
        ballot: [{ participant_id: 'p2', display_name: 'Alex' }],
      })
    })

    it('returns null for invalid payload', () => {
      expect(parseSessionDebriefState(null)).toBeNull()
      expect(parseSessionDebriefState('bad')).toBeNull()
    })
  })

  describe('step navigation helpers', () => {
    it('tracks step index and count', () => {
      const steps: SessionDebriefStep[] = ['mvp', 'stats', 'feedback']
      expect(debriefStepIndex(steps, 'stats')).toBe(2)
      expect(debriefStepCount(steps)).toBe(3)
    })

    it('walks forward and backward through enabled steps', () => {
      const steps: SessionDebriefStep[] = ['mvp', 'stats', 'feedback']
      expect(nextDebriefStep(steps, 'mvp')).toBe('stats')
      expect(nextDebriefStep(steps, 'feedback')).toBeNull()
    })

    it('identifies the first debrief step', () => {
      const steps: SessionDebriefStep[] = ['mvp', 'stats', 'feedback']
      expect(isFirstDebriefStep(steps, 'mvp')).toBe(true)
      expect(isFirstDebriefStep(steps, 'stats')).toBe(false)
      expect(isFirstDebriefStep(['feedback'], 'feedback')).toBe(true)
    })

    it('resumes at the first incomplete step', () => {
      expect(
        resolveInitialDebriefStep({
          ...baseState,
          mvp_step_complete: true,
          mvp_skipped: true,
          stats_step_complete: false,
        }),
      ).toBe('stats')

      expect(
        resolveInitialDebriefStep({
          ...baseState,
          mvp_step_complete: true,
          stats_step_complete: true,
          feedback_step_complete: false,
          mvp_skipped: true,
        }),
      ).toBe('feedback')
    })

    it('shows step indicator when MVP or stats are enabled', () => {
      expect(
        shouldShowDebriefStepIndicator({
          ...baseState,
          mvp_voting_enabled: true,
          player_stats_enabled: false,
        }),
      ).toBe(true)

      expect(
        shouldShowDebriefStepIndicator({
          ...baseState,
          mvp_voting_enabled: false,
          player_stats_enabled: true,
        }),
      ).toBe(true)

      expect(
        shouldShowDebriefStepIndicator({
          ...baseState,
          mvp_voting_enabled: false,
          player_stats_enabled: false,
          steps: ['feedback'],
        }),
      ).toBe(false)
    })

    it('still shows MVP when voting closed but not yet acknowledged', () => {
      expect(
        isMvpWizardStepPending({
          ...baseState,
          mvp_voting_open: false,
          mvp_step_complete: true,
        }),
      ).toBe(true)

      expect(
        resolveInitialDebriefStep({
          ...baseState,
          mvp_voting_open: false,
          mvp_step_complete: true,
          player_stats_enabled: false,
          steps: ['mvp', 'feedback'],
        }),
      ).toBe('mvp')
    })
  })

  describe('validateSessionPlayerStatsInput', () => {
    it('accepts whole numbers from 0 to 99', () => {
      expect(validateSessionPlayerStatsInput(0, 3)).toEqual({ ok: true })
      expect(validateSessionPlayerStatsInput(12, 99)).toEqual({ ok: true })
    })

    it('rejects invalid values', () => {
      expect(validateSessionPlayerStatsInput(-1, 0).ok).toBe(false)
      expect(validateSessionPlayerStatsInput(0, 100).ok).toBe(false)
      expect(validateSessionPlayerStatsInput(1.5, 0).ok).toBe(false)
    })
  })
})
