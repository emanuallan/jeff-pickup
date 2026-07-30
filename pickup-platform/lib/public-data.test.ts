import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectCalls, results } = vi.hoisted(() => ({
  selectCalls: [] as string[],
  results: [] as Array<{ data: unknown; error: unknown }>,
}))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({
    from: () => ({
      select: (columns: string) => {
        selectCalls.push(columns)
        const result = results.shift() ?? { data: [], error: null }
        const builder = {
          eq: () => builder,
          order: () => Promise.resolve(result),
        }
        return builder
      },
    }),
  }),
}))

import { getPublicRosterLive } from './public-data'

const row = {
  id: 'signup-1',
  event_id: 'event-1',
  participant_id: 'participant-1',
  display_name: 'Ada',
  guest_count: 0,
  arrival_status: 'going',
  created_at: '2026-07-30T12:00:00Z',
}

describe('getPublicRosterLive', () => {
  beforeEach(() => {
    selectCalls.length = 0
    results.length = 0
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('reads team when the column exists', async () => {
    results.push({ data: [{ ...row, team: 2 }], error: null })

    const roster = await getPublicRosterLive('event-1')

    expect(selectCalls).toHaveLength(1)
    expect(roster).toHaveLength(1)
    expect(roster[0]!.team).toBe(2)
  })

  it('still returns the roster when the team column is missing', async () => {
    results.push({
      data: null,
      error: { code: '42703', message: 'column event_roster_public.team does not exist' },
    })
    results.push({ data: [row], error: null })

    const roster = await getPublicRosterLive('event-1')

    expect(selectCalls).toHaveLength(2)
    expect(selectCalls[0]).toContain('team')
    expect(selectCalls[1]).not.toContain('team')
    expect(roster).toHaveLength(1)
    expect(roster[0]!.display_name).toBe('Ada')
    expect(roster[0]!.team).toBeNull()
  })

  it('does not retry on unrelated errors', async () => {
    results.push({ data: null, error: { code: '42501', message: 'permission denied' } })

    const roster = await getPublicRosterLive('event-1')

    expect(selectCalls).toHaveLength(1)
    expect(roster).toEqual([])
  })
})
