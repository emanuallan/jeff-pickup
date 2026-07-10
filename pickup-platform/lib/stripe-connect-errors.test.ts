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

  it('treats missing sponsorship tables as migration required', () => {
    const result = classifyStripeConnectFailure(
      new Error(
        'org_stripe_accounts lookup failed: relation "public.org_stripe_accounts" does not exist',
      ),
    )
    expect(result.code).toBe('migration_required')
  })

  it('does not misclassify permission errors on existing tables', () => {
    const result = classifyStripeConnectFailure(
      new Error('org_stripe_accounts lookup failed: permission denied for table org_stripe_accounts'),
    )
    expect(result.code).toBe('database_permission')
  })

  it('does not misclassify generic org_stripe_accounts mentions', () => {
    const result = classifyStripeConnectFailure(
      new Error('upsert_org_stripe_account failed: permission denied for table org_stripe_accounts'),
    )
    expect(result.code).toBe('database_permission')
  })
})

describe('getStripeConnectErrorDisplay', () => {
  it('mentions sponsorship migrations for database permission errors', () => {
    const display = getStripeConnectErrorDisplay('database_permission')
    expect(display?.message).toContain('053')
    expect(display?.message).toContain('054')
  })
})
