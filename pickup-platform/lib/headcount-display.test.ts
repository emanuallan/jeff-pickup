import { describe, expect, it } from 'vitest'
import { showHeadcountChipOnCard } from './headcount-display'

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
