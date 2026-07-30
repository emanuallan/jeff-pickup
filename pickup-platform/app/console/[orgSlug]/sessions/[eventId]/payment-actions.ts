'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getEventByRef } from '@/lib/events'
import { getOrgForMember } from '@/lib/orgs'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import {
  refundSessionPayment,
  stripeErrorMessage,
  type SessionRefundPolicy,
} from '@/lib/stripe-connect'
import { createAdminClient } from '@/lib/supabase/admin'

type RefundResult =
  | { ok: true; refundedAmountCents: number }
  | { error: string }

function isSessionRefundPolicy(value: string): value is SessionRefundPolicy {
  return value === 'retain_fees' || value === 'full'
}

function revalidateSessionPaymentPaths(orgSlug: string, eventRef: string, orgId: string) {
  revalidatePath(`/console/${orgSlug}/sessions/${eventRef}`)
  revalidatePath(`/console/${orgSlug}/sessions/${eventRef}/edit`)
  revalidatePath(`/console/${orgSlug}/sessions`)
  revalidatePath(`/org/${orgSlug}`)
  revalidateTag(`org-events:${orgId}`)
  revalidateTag(`event:${orgSlug}:${eventRef}`)
}

export async function refundSessionSignupPayment(
  orgSlug: string,
  eventRef: string,
  paymentId: string,
  policy: SessionRefundPolicy | string,
): Promise<RefundResult> {
  if (!isSessionRefundPolicy(policy)) {
    return { error: 'Choose a valid refund type.' }
  }

  const org = await getOrgForMember(orgSlug)
  if (!org) {
    return { error: 'Not authorized.' }
  }

  const event = await getEventByRef(eventRef, org.id)
  if (!event) {
    return { error: 'Session not found.' }
  }

  const admin = createAdminClient()
  const { data: payment, error: paymentError } = await admin
    .from('event_payments')
    .select('id, status, stripe_payment_intent_id')
    .eq('id', paymentId)
    .eq('org_id', org.id)
    .eq('event_id', event.id)
    .maybeSingle()

  if (paymentError || !payment) {
    return { error: 'Payment not found.' }
  }
  if (payment.status === 'refunded') {
    return { error: 'This payment has already been refunded.' }
  }
  if (payment.status !== 'completed') {
    return { error: 'Only completed payments can be refunded.' }
  }
  if (!payment.stripe_payment_intent_id) {
    return { error: 'The Stripe payment could not be found.' }
  }

  const stripeAccount = await getOrgStripeAccount(org.id)
  if (!stripeAccount?.stripe_account_id) {
    return { error: 'Stripe is not connected for this group.' }
  }

  try {
    const refunded = await refundSessionPayment({
      paymentIntentId: payment.stripe_payment_intent_id,
      stripeAccountId: stripeAccount.stripe_account_id,
      policy,
      idempotencyKey: `session-refund-${payment.id}-${policy}`,
    })

    const { error: updateError } = await admin
      .from('event_payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id)
      .eq('status', 'completed')

    if (updateError) {
      console.error('Session payment refunded but DB update failed', {
        orgSlug,
        eventRef,
        paymentId,
        message: updateError.message,
      })
      return {
        error: 'Refund issued in Stripe, but Organizr could not update the payment status.',
      }
    }

    revalidateSessionPaymentPaths(orgSlug, eventRef, org.id)
    return { ok: true, refundedAmountCents: refunded.refundAmountCents }
  } catch (error) {
    console.error('Session payment refund failed', {
      orgSlug,
      eventRef,
      paymentId,
      policy,
      message: stripeErrorMessage(error),
      error,
    })
    const detail = stripeErrorMessage(error)
    return {
      error: detail
        ? `Could not refund this payment: ${detail}`
        : 'Could not refund this payment. Try again, or issue it manually in Stripe.',
    }
  }
}
