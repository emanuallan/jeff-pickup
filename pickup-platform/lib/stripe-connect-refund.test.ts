import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refundAndCancelSponsorshipSubscription } from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}))

import { getStripe } from '@/lib/stripe'

describe('refundAndCancelSponsorshipSubscription', () => {
  const refundsCreate = vi.fn()
  const subscriptionsCancel = vi.fn()
  const subscriptionsRetrieve = vi.fn()
  const invoicesList = vi.fn()
  const paymentIntentsRetrieve = vi.fn()

  beforeEach(() => {
    refundsCreate.mockReset()
    subscriptionsCancel.mockReset()
    subscriptionsRetrieve.mockReset()
    invoicesList.mockReset()
    paymentIntentsRetrieve.mockReset()

    subscriptionsRetrieve.mockResolvedValue({
      latest_invoice: {
        status: 'paid',
        payment_intent: 'pi_test_1',
      },
    })
    invoicesList.mockResolvedValue({ data: [] })
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      latest_charge: {
        application_fee_amount: 125,
      },
    })
    refundsCreate.mockResolvedValue({ id: 're_test_1' })
    subscriptionsCancel.mockResolvedValue({ id: 'sub_test_1' })

    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: subscriptionsRetrieve,
        cancel: subscriptionsCancel,
      },
      invoices: {
        list: invoicesList,
      },
      paymentIntents: {
        retrieve: paymentIntentsRetrieve,
      },
      refunds: {
        create: refundsCreate,
      },
    } as never)
  })

  it('refunds the payment minus the platform fee and cancels the subscription', async () => {
    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
      checkoutSessionId: 'cs_test_1',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(paymentIntentsRetrieve).toHaveBeenCalledWith(
      'pi_test_1',
      { expand: ['latest_charge'] },
      { stripeAccount: 'acct_test_1' },
    )
    expect(refundsCreate).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_test_1',
        amount: 2375,
        refund_application_fee: false,
      },
      { stripeAccount: 'acct_test_1' },
    )
    expect(subscriptionsCancel).toHaveBeenCalledWith(
      'sub_test_1',
      {},
      { stripeAccount: 'acct_test_1' },
    )
  })

  it('still cancels when there is nothing to refund', async () => {
    subscriptionsRetrieve.mockResolvedValue({ latest_invoice: null })

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result).toEqual({ refunded: false, canceled: true })
    expect(refundsCreate).not.toHaveBeenCalled()
    expect(subscriptionsCancel).toHaveBeenCalled()
  })

  it('treats already-refunded charges as success', async () => {
    refundsCreate.mockRejectedValue({ code: 'charge_already_refunded' })

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result.refunded).toBe(true)
    expect(subscriptionsCancel).toHaveBeenCalled()
  })
})
