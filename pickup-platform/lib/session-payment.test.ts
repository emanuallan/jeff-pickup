import { describe, expect, it } from 'vitest'
import {
  buildAbandonedCheckouts,
  buildSessionPaymentOverview,
  formatPriceCents,
  isPaidSession,
  paidSessionHeadcount,
  sessionFeeOrganizerPayoutHint,
  sessionPaymentOrganizerShareCents,
  sessionPaymentPlatformFeeCents,
  sessionPaymentTotalCents,
  STRIPE_PROCESSING_FEES_URL,
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
    expect(sessionFeeOrganizerPayoutHint(null)).toMatch(/stripe also deducts card processing fees/i)

    const paid = sessionFeeOrganizerPayoutHint(1000)
    expect(paid).toMatch(/players pay \$10\.00/i)
    expect(paid).toMatch(/organizr keeps 5% \(\$0\.50\)/i)
    expect(paid).toMatch(/about \$9\.50 reaches your stripe balance/i)
    expect(paid).toMatch(/before stripe deducts card processing fees/i)
    expect(STRIPE_PROCESSING_FEES_URL).toBe('https://stripe.com/pricing')
  })
})

describe('buildSessionPaymentOverview', () => {
  it('aggregates completed amounts and headcount', () => {
    const overview = buildSessionPaymentOverview(
      [
        { amount_cents: 1500, status: 'completed', guest_count: 0 },
        { amount_cents: 3000, status: 'completed', guest_count: 1 },
        { amount_cents: 1500, status: 'pending', guest_count: 0 },
        { amount_cents: 1500, status: 'failed', guest_count: 0 },
        { amount_cents: 1500, status: 'refunded', guest_count: 0 },
      ],
      5,
    )

    expect(overview.completedCount).toBe(2)
    expect(overview.pendingCount).toBe(1)
    expect(overview.failedCount).toBe(1)
    expect(overview.refundedCount).toBe(1)
    expect(overview.collectedCents).toBe(4500)
    expect(overview.platformFeeCents).toBe(225)
    expect(overview.organizerShareCents).toBe(4275)
    expect(overview.paidHeadcount).toBe(3)
  })

  it('returns zeros for an empty list', () => {
    expect(buildSessionPaymentOverview([])).toEqual({
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      refundedCount: 0,
      collectedCents: 0,
      platformFeeCents: 0,
      organizerShareCents: 0,
      paidHeadcount: 0,
    })
  })
})

describe('buildAbandonedCheckouts', () => {
  const base = {
    guest_count: 0,
    amount_cents: 1000,
    display_name: null as string | null,
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '+15551111111',
  }

  it('lists pending people who never completed', () => {
    const people = buildAbandonedCheckouts([
      {
        ...base,
        id: 'p1',
        status: 'pending',
        participant_id: 'part-1',
        created_at: '2026-07-30T10:00:00.000Z',
        display_name: 'Ada',
      },
    ])

    expect(people).toHaveLength(1)
    expect(people[0]?.participantId).toBe('part-1')
    expect(people[0]?.displayName).toBe('Ada')
  })

  it('excludes people who later completed checkout', () => {
    const people = buildAbandonedCheckouts([
      {
        ...base,
        id: 'p1',
        status: 'pending',
        participant_id: 'part-1',
        created_at: '2026-07-30T10:00:00.000Z',
      },
      {
        ...base,
        id: 'p2',
        status: 'completed',
        participant_id: 'part-1',
        created_at: '2026-07-30T10:05:00.000Z',
      },
      {
        ...base,
        id: 'p3',
        status: 'pending',
        participant_id: 'part-2',
        created_at: '2026-07-30T10:01:00.000Z',
        first_name: 'Grace',
        last_name: 'Hopper',
        phone: '+15552222222',
        display_name: 'Grace',
      },
    ])

    expect(people).toHaveLength(1)
    expect(people[0]?.participantId).toBe('part-2')
  })

  it('dedupes multiple pending attempts for the same person', () => {
    const people = buildAbandonedCheckouts([
      {
        ...base,
        id: 'p1',
        status: 'pending',
        participant_id: 'part-1',
        created_at: '2026-07-30T10:00:00.000Z',
        amount_cents: 1000,
      },
      {
        ...base,
        id: 'p2',
        status: 'pending',
        participant_id: 'part-1',
        created_at: '2026-07-30T11:00:00.000Z',
        amount_cents: 2000,
        guest_count: 1,
      },
    ])

    expect(people).toHaveLength(1)
    expect(people[0]?.paymentId).toBe('p2')
    expect(people[0]?.amountCents).toBe(2000)
    expect(people[0]?.guestCount).toBe(1)
  })
})