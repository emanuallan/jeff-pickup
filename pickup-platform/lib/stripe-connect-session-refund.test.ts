import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refundSessionPayment } from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

import { getStripe } from '@/lib/stripe'

describe('refundSessionPayment', () => {
  const paymentIntentsRetrieve = vi.fn()
  const refundsCreate = vi.fn()

  beforeEach(() => {
    paymentIntentsRetrieve.mockReset()
    refundsCreate.mockReset()
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      application_fee_amount: 125,
      latest_charge: {
        id: 'ch_test_1',
        amount: 2500,
        amount_refunded: 0,
        application_fee_amount: 125,
        refunded: false,
        balance_transaction: {
          fee: 220,
          fee_details: [
            { type: 'stripe_fee', amount: 95 },
            { type: 'application_fee', amount: 125 },
          ],
        },
      },
    })
    refundsCreate.mockResolvedValue({ id: 're_test_1' })
    vi.mocked(getStripe).mockReturnValue({
      paymentIntents: { retrieve: paymentIntentsRetrieve },
      refunds: { create: refundsCreate },
    } as never)
  })

  it('refunds the participant portion while retaining platform and card fees', async () => {
    const result = await refundSessionPayment({
      paymentIntentId: 'pi_test_1',
      stripeAccountId: 'acct_test_1',
      policy: 'retain_fees',
      idempotencyKey: 'session-refund-pay-1-retain',
    })

    expect(result).toEqual({ refunded: true, refundAmountCents: 2280 })
    expect(refundsCreate).toHaveBeenCalledWith(
      {
        charge: 'ch_test_1',
        amount: 2280,
        refund_application_fee: false,
      },
      {
        stripeAccount: 'acct_test_1',
        idempotencyKey: 'session-refund-pay-1-retain',
      },
    )
  })

  it('refunds the full remaining charge and application fee', async () => {
    const result = await refundSessionPayment({
      paymentIntentId: 'pi_test_1',
      stripeAccountId: 'acct_test_1',
      policy: 'full',
    })

    expect(result).toEqual({ refunded: true, refundAmountCents: 2500 })
    expect(refundsCreate).toHaveBeenCalledWith(
      {
        charge: 'ch_test_1',
        amount: 2500,
        refund_application_fee: true,
      },
      { stripeAccount: 'acct_test_1' },
    )
  })

  it('is idempotent when Stripe reports the charge as fully refunded', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      latest_charge: {
        id: 'ch_test_1',
        amount_refunded: 2500,
        refunded: true,
      },
    })

    await expect(
      refundSessionPayment({
        paymentIntentId: 'pi_test_1',
        stripeAccountId: 'acct_test_1',
        policy: 'full',
      }),
    ).resolves.toEqual({ refunded: true, refundAmountCents: 0 })
    expect(refundsCreate).not.toHaveBeenCalled()
  })
})
