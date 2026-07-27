import { describe, expect, it } from 'vitest'
import {
  formatPriceCents,
  isPaidSession,
  linkedParticipantPhoneMismatch,
  paidSessionHeadcount,
  sessionPaymentTotalCents,
} from './session-payment'

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

describe('sessionPaymentTotalCents', () => {
  it('charges per person including the joiner', () => {
    expect(paidSessionHeadcount(0)).toBe(1)
    expect(paidSessionHeadcount(2)).toBe(3)
    expect(sessionPaymentTotalCents(500, 0)).toBe(500)
    expect(sessionPaymentTotalCents(500, 2)).toBe(1500)
  })

  it('returns 0 for invalid per-person fees', () => {
    expect(sessionPaymentTotalCents(0, 2)).toBe(0)
    expect(sessionPaymentTotalCents(-100, 1)).toBe(0)
  })
})

describe('linkedParticipantPhoneMismatch', () => {
  it('allows empty form phone (use linked row as-is)', () => {
    expect(linkedParticipantPhoneMismatch('12025550101', '')).toBe(false)
  })

  it('allows matching phones after normalization', () => {
    expect(linkedParticipantPhoneMismatch('12025550101', '2025550101')).toBe(false)
    expect(linkedParticipantPhoneMismatch('+1 (202) 555-0101', '2025550101')).toBe(false)
  })

  it('rejects a different form phone', () => {
    expect(linkedParticipantPhoneMismatch('12025550101', '2025559999')).toBe(true)
  })
})
