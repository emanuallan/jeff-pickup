import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refundAndCancelSponsorshipSubscription } from './stripe-connect'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  getPlatformFeePercent: vi.fn(() => 5),
}))

import { getStripe } from '@/lib/stripe'

describe('refundAndCancelSponsorshipSubscription', () => {
  const refundsCreate = vi.fn()
  const subscriptionsCancel = vi.fn()
  const subscriptionsRetrieve = vi.fn()
  const invoicesList = vi.fn()
  const invoicesRetrieve = vi.fn()
  const invoicePaymentsList = vi.fn()
  const paymentIntentsRetrieve = vi.fn()
  const checkoutSessionsRetrieve = vi.fn()

  beforeEach(() => {
    refundsCreate.mockReset()
    subscriptionsCancel.mockReset()
    subscriptionsRetrieve.mockReset()
    invoicesList.mockReset()
    invoicesRetrieve.mockReset()
    invoicePaymentsList.mockReset()
    paymentIntentsRetrieve.mockReset()
    checkoutSessionsRetrieve.mockReset()

    subscriptionsRetrieve.mockResolvedValue({
      latest_invoice: {
        id: 'in_test_1',
        status: 'paid',
      },
    })
    invoicesList.mockResolvedValue({ data: [] })
    invoicesRetrieve.mockResolvedValue({
      id: 'in_test_1',
      payments: { data: [] },
    })
    invoicePaymentsList.mockResolvedValue({
      data: [
        {
          status: 'paid',
          payment: {
            type: 'payment_intent',
            payment_intent: 'pi_test_1',
          },
        },
      ],
    })
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
    subscriptionsCancel.mockResolvedValue({ id: 'sub_test_1' })

    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: subscriptionsRetrieve,
        cancel: subscriptionsCancel,
      },
      invoices: {
        list: invoicesList,
        retrieve: invoicesRetrieve,
      },
      invoicePayments: {
        list: invoicePaymentsList,
      },
      checkout: {
        sessions: {
          retrieve: checkoutSessionsRetrieve,
        },
      },
      paymentIntents: {
        retrieve: paymentIntentsRetrieve,
      },
      refunds: {
        create: refundsCreate,
      },
    } as never)
  })

  it('refunds via charge amount minus platform + Stripe fees, then cancels', async () => {
    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
      checkoutSessionId: 'cs_test_1',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(invoicePaymentsList).toHaveBeenCalledWith(
      {
        invoice: 'in_test_1',
        status: 'paid',
        limit: 10,
        expand: ['data.payment.payment_intent'],
      },
      { stripeAccount: 'acct_test_1' },
    )
    expect(paymentIntentsRetrieve).toHaveBeenCalledWith(
      'pi_test_1',
      { expand: ['latest_charge.balance_transaction'] },
      { stripeAccount: 'acct_test_1' },
    )
    expect(refundsCreate).toHaveBeenCalledWith(
      {
        charge: 'ch_test_1',
        amount: 2280,
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

  it('fails instead of canceling when the paid charge cannot be found', async () => {
    subscriptionsRetrieve.mockResolvedValue({ latest_invoice: null })
    invoicesList.mockResolvedValue({ data: [] })
    checkoutSessionsRetrieve.mockResolvedValue({
      payment_intent: null,
      invoice: null,
    })

    await expect(
      refundAndCancelSponsorshipSubscription({
        subscriptionId: 'sub_test_1',
        stripeAccountId: 'acct_test_1',
        checkoutSessionId: 'cs_test_1',
      }),
    ).rejects.toThrow(/paid sponsorship charge/i)

    expect(refundsCreate).not.toHaveBeenCalled()
    expect(subscriptionsCancel).not.toHaveBeenCalled()
  })

  it('treats already-refunded charges as success and still cancels', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      application_fee_amount: 125,
      latest_charge: {
        id: 'ch_test_1',
        amount: 2500,
        amount_refunded: 2500,
        application_fee_amount: 125,
        refunded: true,
      },
    })

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(refundsCreate).not.toHaveBeenCalled()
    expect(subscriptionsCancel).toHaveBeenCalled()
  })

  it('treats fee-only remainder after a prior sponsor refund as already done', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      application_fee_amount: 125,
      latest_charge: {
        id: 'ch_test_1',
        amount: 2500,
        amount_refunded: 2280,
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

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(refundsCreate).not.toHaveBeenCalled()
    expect(subscriptionsCancel).toHaveBeenCalled()
  })

  it('treats legacy platform-fee-only remainder as already done', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      application_fee_amount: 125,
      latest_charge: {
        id: 'ch_test_1',
        amount: 2500,
        amount_refunded: 2375,
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

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(refundsCreate).not.toHaveBeenCalled()
    expect(subscriptionsCancel).toHaveBeenCalled()
  })

  it('treats Stripe charge_already_refunded as success', async () => {
    refundsCreate.mockRejectedValue({ code: 'charge_already_refunded' })

    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
    })

    expect(result.refunded).toBe(true)
    expect(subscriptionsCancel).toHaveBeenCalled()
  })

  it('full policy refunds remaining charge and application fee', async () => {
    const result = await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
      refundPolicy: 'full',
    })

    expect(result).toEqual({ refunded: true, canceled: true })
    expect(refundsCreate).toHaveBeenCalledWith(
      {
        charge: 'ch_test_1',
        amount: 2500,
        refund_application_fee: true,
      },
      { stripeAccount: 'acct_test_1' },
    )
  })

  it('full policy refunds only the unpaid remainder after a prior partial refund', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      amount: 2500,
      status: 'succeeded',
      application_fee_amount: 125,
      latest_charge: {
        id: 'ch_test_1',
        amount: 2500,
        amount_refunded: 2280,
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

    await refundAndCancelSponsorshipSubscription({
      subscriptionId: 'sub_test_1',
      stripeAccountId: 'acct_test_1',
      refundPolicy: 'full',
    })

    expect(refundsCreate).toHaveBeenCalledWith(
      {
        charge: 'ch_test_1',
        amount: 220,
        refund_application_fee: true,
      },
      { stripeAccount: 'acct_test_1' },
    )
  })
})
