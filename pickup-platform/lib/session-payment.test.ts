import { describe, expect, it } from 'vitest'
import {
  formatPriceCents,
  isPaidSession,
  paidSessionHeadcount,
  sessionFeeOrganizerPayoutHint,
  sessionPaymentOrganizerShareCents,
  sessionPaymentPlatformFeeCents,
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

describe('session payment organizer payout', () => {
  it('takes the platform fee from the charged amount', () => {
    expect(sessionPaymentPlatformFeeCents(1000, 5)).toBe(50)
    expect(sessionPaymentOrganizerShareCents(1000, 5)).toBe(950)
  })

  it('explains free vs paid payout clearly', () => {
    expect(sessionFeeOrganizerPayoutHint(null)).toMatch(/leave blank for free/i)
    expect(sessionFeeOrganizerPayoutHint(null)).toMatch(/organizr keeps 5%/i)
    expect(sessionFeeOrganizerPayoutHint(null)).toMatch(/stripe card fees/i)

    const paid = sessionFeeOrganizerPayoutHint(1000)
    expect(paid).toMatch(/players pay \$10\.00/i)
    expect(paid).toMatch(/about \$9\.50 per person/i)
    expect(paid).toMatch(/before stripe card fees/i)
  })
})