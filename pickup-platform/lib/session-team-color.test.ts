import { describe, expect, it } from 'vitest'
import {
  assignTeamColor,
  defaultTeamColors,
  parseSubmittedTeamColors,
  parseTeamColors,
  resizeTeamColors,
  sessionTeamHeading,
  sessionTeamShirtHint,
  takenTeamColors,
} from './session-team-color'

describe('session-team-color', () => {
  it('defaults unique main colors in palette order', () => {
    expect(defaultTeamColors(2)).toEqual(['white', 'black'])
    expect(defaultTeamColors(4)).toEqual(['white', 'black', 'red', 'blue'])
    expect(new Set(defaultTeamColors(8)).size).toBe(8)
  })

  it('repairs missing, invalid, and duplicate stored colors', () => {
    expect(resizeTeamColors(['red', 'red', 'nope'], 3)).toEqual(['red', 'white', 'black'])
    expect(resizeTeamColors([], 2)).toEqual(['white', 'black'])
    expect(parseTeamColors(['green', 'yellow'], 2)).toEqual(['green', 'yellow'])
    expect(parseTeamColors(null, 2)).toEqual(['white', 'black'])
    expect(parseTeamColors(['white', 'black'], null)).toBeNull()
  })

  it('rejects duplicate submitted colors and fills when omitted', () => {
    expect(parseSubmittedTeamColors(['white', 'black'], 2)).toEqual({
      ok: true,
      colors: ['white', 'black'],
    })
    expect(parseSubmittedTeamColors([], 2)).toEqual({
      ok: true,
      colors: ['white', 'black'],
    })
    expect(parseSubmittedTeamColors(['white', 'white'], 2)).toEqual({
      ok: false,
      error: 'Each team needs a different shirt color.',
    })
    expect(parseSubmittedTeamColors(['white'], 2)).toEqual({
      ok: false,
      error: 'Pick a shirt color for each team.',
    })
    expect(parseSubmittedTeamColors(['white', 'black'], null)).toEqual({
      ok: true,
      colors: null,
    })
  })

  it('blocks assigning a color another team already has', () => {
    expect(assignTeamColor(['white', 'black'], 0, 'black')).toEqual(['white', 'black'])
    expect(assignTeamColor(['white', 'black'], 0, 'red')).toEqual(['red', 'black'])
    expect(takenTeamColors(['white', 'black', 'red'], 1)).toEqual(new Set(['white', 'red']))
  })

  it('labels teams with the shirt color', () => {
    expect(sessionTeamHeading(1, 'white')).toBe('Team 1 · White')
    expect(sessionTeamHeading(2)).toBe('Team 2')
    expect(sessionTeamShirtHint('blue')).toBe('Bring a blue shirt')
  })
})
