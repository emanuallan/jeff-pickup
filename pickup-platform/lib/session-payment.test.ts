import { describe, expect, it } from 'vitest'
import { formatPriceCents, isPaidSession } from './session-payment'

describe('isPaidSession', () => {
  it('treats null and zero as free', () => {
    expect(isPaidSession(null)).toBe(false)
    expect(isPaidSession(undefined)).toBe(false)
    expect(isPaidSession(0)).toBe(false)
  })

  it('treats positive cents as paid', () => {
    expect(isPaidSession(1)).toBe(true)
    expect(isPaidSession(1500)).toBe(true)
  })
})

describe('formatPriceCents', () => {
  it('formats usd amounts', () => {
    expect(formatPriceCents(0)).toBe('$0.00')
    expect(formatPriceCents(1500)).toBe('$15.00')
  })
})
