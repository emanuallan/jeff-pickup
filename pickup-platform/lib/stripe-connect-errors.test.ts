import { describe, expect, it } from 'vitest'
import {
  classifyStripeConnectFailure,
  getStripeConnectErrorDisplay,
} from '@/lib/stripe-connect-errors'

describe('classifyStripeConnectFailure', () => {
  it('detects rpc upsert failures', () => {
    const result = classifyStripeConnectFailure(
      new Error('upsert_org_stripe_account failed: permission denied for function upsert_org_stripe_account'),
    )
    expect(result.code).toBe('database_permission')
  })
})

describe('getStripeConnectErrorDisplay', () => {
  it('mentions migration 053 for database permission errors', () => {
    const display = getStripeConnectErrorDisplay('database_permission')
    expect(display?.message).toContain('053')
  })
})
