export type StripeConnectErrorCode =
  | 'stripe_not_configured'
  | 'unauthorized'
  | 'stripe_connect_not_enabled'
  | 'stripe_platform_profile_incomplete'
  | 'stripe_auth_failed'
  | 'migration_required'
  | 'database_permission'
  | 'supabase_admin_missing'
  | 'stripe_account_not_found'
  | 'stripe_onboarding_incomplete'
  | 'stripe_invalid_request'
  | 'stripe_error'

export type StripeConnectErrorDisplay = {
  code: StripeConnectErrorCode
  title: string
  message: string
  action?: {
    href: string
    label: string
    external?: boolean
  }
}

const CONNECT_ERROR_DISPLAY: Record<StripeConnectErrorCode, StripeConnectErrorDisplay> = {
  stripe_not_configured: {
    code: 'stripe_not_configured',
    title: 'Stripe is not configured',
    message:
      'This environment is missing STRIPE_SECRET_KEY and/or STRIPE_WEBHOOK_SECRET. Add both in Vercel (Production), then redeploy.',
  },
  unauthorized: {
    code: 'unauthorized',
    title: 'Could not start Stripe Connect',
    message: 'Your session may have expired. Sign in again and retry from this page.',
  },
  stripe_connect_not_enabled: {
    code: 'stripe_connect_not_enabled',
    title: 'Stripe Connect is not enabled',
    message:
      'Organizr’s platform Stripe account must complete Connect onboarding before payout accounts can be created. Use the same test/live mode as your API keys.',
    action: {
      href: 'https://dashboard.stripe.com/connect',
      label: 'Open Stripe Connect settings',
      external: true,
    },
  },
  stripe_platform_profile_incomplete: {
    code: 'stripe_platform_profile_incomplete',
    title: 'Finish Stripe Connect platform setup',
    message:
      'Stripe needs you to review platform responsibilities (including who manages losses on connected accounts) before connected accounts can be created.',
    action: {
      href: 'https://dashboard.stripe.com/settings/connect/platform-profile',
      label: 'Open Connect platform profile',
      external: true,
    },
  },
  stripe_auth_failed: {
    code: 'stripe_auth_failed',
    title: 'Stripe rejected the API key',
    message:
      'Check STRIPE_SECRET_KEY in Vercel. The key must match the mode you use in Stripe (test vs live), then redeploy.',
    action: {
      href: 'https://dashboard.stripe.com/apikeys',
      label: 'View Stripe API keys',
      external: true,
    },
  },
  migration_required: {
    code: 'migration_required',
    title: 'Database migration required',
    message:
      'Sponsorship tables are missing in Supabase. Run migrations 052 and 053, then try again.',
  },
  database_permission: {
    code: 'database_permission',
    title: 'Could not save Stripe account',
    message:
      'The database blocked saving the connected account. Run migration 053_sponsorship_service_role_grants.sql in Supabase, then try Connect again.',
  },
  supabase_admin_missing: {
    code: 'supabase_admin_missing',
    title: 'Server configuration incomplete',
    message:
      'SUPABASE_SERVICE_ROLE_KEY is missing on this environment. Add it in Vercel and redeploy.',
  },
  stripe_account_not_found: {
    code: 'stripe_account_not_found',
    title: 'Stripe account not found',
    message:
      'Stripe onboarding finished, but Organizr could not find the connected account. Try Connect Stripe again from this page.',
  },
  stripe_onboarding_incomplete: {
    code: 'stripe_onboarding_incomplete',
    title: 'Stripe onboarding incomplete',
    message:
      'Stripe did not mark this account as fully onboarded yet. Continue setup to finish connecting payouts.',
  },
  stripe_invalid_request: {
    code: 'stripe_invalid_request',
    title: 'Stripe rejected the request',
    message:
      'Stripe returned an error while starting Connect. Check deployment logs and your Stripe account setup.',
  },
  stripe_error: {
    code: 'stripe_error',
    title: 'Stripe Connect failed',
    message:
      'Something went wrong while connecting Stripe. Check deployment logs, verify your keys, and try again.',
  },
}

export function getStripeConnectErrorDisplay(
  code: string | undefined,
): StripeConnectErrorDisplay | null {
  if (!code) return null
  return CONNECT_ERROR_DISPLAY[code as StripeConnectErrorCode] ?? CONNECT_ERROR_DISPLAY.stripe_error
}

type ConnectFailure = {
  code: StripeConnectErrorCode
  logMessage: string
}

function asRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === 'object' ? (error as Record<string, unknown>) : null
}

/** Map Stripe/Supabase failures to stable connect_error codes for the console UI. */
export function classifyStripeConnectFailure(error: unknown): ConnectFailure {
  const record = asRecord(error)
  const message =
    error instanceof Error
      ? error.message
      : typeof record?.message === 'string'
        ? record.message
        : 'Unknown error'

  const lowerMessage = message.toLowerCase()

  if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    return { code: 'supabase_admin_missing', logMessage: message }
  }

  if (lowerMessage.includes('upsert_org_stripe_account failed')) {
    return { code: 'database_permission', logMessage: message }
  }

  const pgCode = typeof record?.code === 'string' ? record.code : null
  if (pgCode === '42501' || pgCode === 'PGRST301') {
    return { code: 'database_permission', logMessage: message }
  }

  if (pgCode === '42P01' || lowerMessage.includes('org_stripe_accounts')) {
    return { code: 'migration_required', logMessage: message }
  }

  if (record?.type === 'StripeAuthenticationError') {
    return { code: 'stripe_auth_failed', logMessage: message }
  }

  if (record?.type === 'StripeInvalidRequestError') {
    if (
      lowerMessage.includes('managing losses') ||
      lowerMessage.includes('platform-profile') ||
      lowerMessage.includes('responsibilities of managing')
    ) {
      return { code: 'stripe_platform_profile_incomplete', logMessage: message }
    }

    if (
      lowerMessage.includes('signed up for connect') ||
      (lowerMessage.includes('connect') && lowerMessage.includes('sign up'))
    ) {
      return { code: 'stripe_connect_not_enabled', logMessage: message }
    }

    return { code: 'stripe_invalid_request', logMessage: message }
  }

  return { code: 'stripe_error', logMessage: message }
}
