import { describe, expect, it } from 'vitest'
import { paymentRequiredResult } from './event-price'

describe('paymentRequiredResult', () => {
  it('includes price when paid', () => {
    expect(paymentRequiredResult(1500)).toEqual({
      error: 'This session requires payment.',
      code: 'payment_required',
      priceCents: 1500,
    })
  })

  it('omits price when unknown', () => {
    expect(paymentRequiredResult(null)).toEqual({
      error: 'This session requires payment.',
      code: 'payment_required',
    })
  })
})
