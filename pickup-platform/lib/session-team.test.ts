import { describe, expect, it } from 'vitest'
import {
  parseSessionTeamCount,
  pickBalancedTeam,
  sessionTeamLabel,
  sessionTeamOptions,
  sessionTeamsEnabled,
  splitRosterByTeam,
  teamHeadcount,
  teamHeadcountsExcluding,
} from './session-team'

describe('session-team', () => {
  describe('pickBalancedTeam', () => {
    it('prefers the smaller team by headcount', () => {
      expect(pickBalancedTeam([2, 5], () => 0)).toBe(1)
      expect(pickBalancedTeam([5, 2], () => 0)).toBe(2)
      expect(pickBalancedTeam([4, 1, 4], () => 0)).toBe(2)
    })

    it('picks uniformly among ties', () => {
      expect(pickBalancedTeam([3, 3, 3], () => 0)).toBe(1)
      expect(pickBalancedTeam([3, 3, 3], () => 0.5)).toBe(2)
      expect(pickBalancedTeam([3, 3, 3], () => 0.99)).toBe(3)
    })
  })

  describe('teamHeadcountsExcluding', () => {
    it('excludes the current signup and ignores unassigned / out-of-range', () => {
      const entries = [
        { id: 'a', team: 1, guest_count: 1 },
        { id: 'b', team: 2, guest_count: 0 },
        { id: 'c', team: null, guest_count: 2 },
        { id: 'd', team: 3, guest_count: 0 },
        { id: 'me', team: 1, guest_count: 0 },
      ]
      expect(teamHeadcountsExcluding(entries, 3, 'me')).toEqual([2, 1, 1])
    })
  })

  describe('splitRosterByTeam', () => {
    it('buckets into N teams and unassigned', () => {
      const split = splitRosterByTeam(
        [
          { id: '1', team: 1 },
          { id: '2', team: 2 },
          { id: '3', team: 3 },
          { id: '4', team: null },
          { id: '5', team: 9 },
          { id: '6' },
        ],
        3,
      )
      expect(split.teams.map((t) => t.map((e) => e.id))).toEqual([['1'], ['2'], ['3']])
      expect(split.unassigned.map((e) => e.id)).toEqual(['4', '5', '6'])
    })
  })

  describe('labels, options, parse', () => {
    it('labels teams', () => {
      expect(sessionTeamLabel(1)).toBe('Team 1')
      expect(sessionTeamLabel(4)).toBe('Team 4')
      expect(sessionTeamLabel(null)).toBe('Unassigned')
    })

    it('builds options and headcount', () => {
      expect(sessionTeamOptions(4)).toEqual([1, 2, 3, 4])
      expect(teamHeadcount([{ guest_count: 0 }, { guest_count: 2 }])).toBe(4)
    })

    it('parses team_count and gates feature+session', () => {
      expect(parseSessionTeamCount('')).toBeNull()
      expect(parseSessionTeamCount('1')).toBeNull()
      expect(parseSessionTeamCount('2')).toBe(2)
      expect(parseSessionTeamCount('8')).toBe(8)
      expect(parseSessionTeamCount('9')).toBeNull()
      expect(sessionTeamsEnabled(true, 3)).toBe(true)
      expect(sessionTeamsEnabled(true, null)).toBe(false)
      expect(sessionTeamsEnabled(false, 3)).toBe(false)
    })
  })
})
