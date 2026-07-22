import { describe, expect, it } from 'vitest'
import { showHeadcountChipOnCard, showMinPlayersChip } from './headcount-display'

describe('showHeadcountChipOnCard', () => {
  it('shows the chip when more than one person is signed up', () => {
    expect(showHeadcountChipOnCard(0)).toBe(false)
    expect(showHeadcountChipOnCard(1)).toBe(false)
    expect(showHeadcountChipOnCard(2)).toBe(true)
  })

  it('hides the chip when the event is cancelled', () => {
    expect(showHeadcountChipOnCard(5, { cancelled: true })).toBe(false)
  })
})

describe('showMinPlayersChip', () => {
  it('shows only while the session is still tentative', () => {
    expect(showMinPlayersChip(8, 'tentative')).toBe(true)
    expect(showMinPlayersChip(8, 'on')).toBe(false)
    expect(showMinPlayersChip(8, 'cancelled')).toBe(false)
  })

  it('hides when there is no minimum', () => {
    expect(showMinPlayersChip(null, 'tentative')).toBe(false)
    expect(showMinPlayersChip(undefined, 'tentative')).toBe(false)
  })
})
