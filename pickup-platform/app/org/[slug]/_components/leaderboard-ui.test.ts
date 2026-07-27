import { describe, expect, it } from 'vitest'
import { denseRank, formatMvpCountLabel } from './leaderboard-ui'

describe('formatMvpCountLabel', () => {
  it('singularizes a single MVP', () => {
    expect(formatMvpCountLabel(1)).toBe('MVP')
  })

  it('pluralizes multiple MVPs', () => {
    expect(formatMvpCountLabel(0)).toBe('MVPs')
    expect(formatMvpCountLabel(2)).toBe('MVPs')
  })
})

describe('denseRank for MVP counts', () => {
  it('ties players with the same MVP count', () => {
    const rows = [
      { mvp_count: 5 },
      { mvp_count: 5 },
      { mvp_count: 2 },
    ]

    expect(denseRank(rows, (row) => row.mvp_count)).toEqual([1, 1, 2])
  })
})
