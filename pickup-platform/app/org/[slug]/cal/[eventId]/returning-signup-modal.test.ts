import { afterEach, describe, expect, it } from 'vitest'
import { markReturningSignupPromptSeen } from './returning-signup-modal'

describe('markReturningSignupPromptSeen', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('stores a per-session flag in localStorage', () => {
    markReturningSignupPromptSeen('demo', 'evt-a')

    expect(localStorage.getItem('returning-signup-seen:demo:evt-a')).toBe('1')
  })
})
