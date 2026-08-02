import { btnOutline, btnPrimary } from '../../_components/console-ui'
import {
  SponsorshipConnectError,
  SponsorshipConnectSuccess,
} from '../sponsorship/sponsorship-connect-error'
import type { StripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'

type Props = {
  stripeConfigured: boolean
  stripeReady: boolean
  hasStripeAccount: boolean
  payoutsEnabled: boolean
  connectPath: string
  payoutsPath: string
  connectErrorDisplay: StripeConnectErrorDisplay | null
  showConnectSuccess: boolean
  showConnectPending: boolean
}

function StatusDot({ tone }: { tone: 'ok' | 'warn' }) {
  return (
    <span
      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
        tone === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
      }`}
      aria-hidden
    />
  )
}

/** Stripe Connect status + connect/continue CTAs. Disconnect lives in Settings. */
export function PaymentsStripePanel({
  stripeConfigured,
  stripeReady,
  hasStripeAccount,
  payoutsEnabled,
  connectPath,
  payoutsPath,
  connectErrorDisplay,
  showConnectSuccess,
  showConnectPending,
}: Props) {
  // Only show the flash banner while Stripe is still verifying — once ready,
  // the connected status row already communicates success.
  const showPendingBanner = showConnectSuccess && showConnectPending && !stripeReady

  return (
    <div className="space-y-4">
      {connectErrorDisplay ? <SponsorshipConnectError error={connectErrorDisplay} /> : null}
      {showPendingBanner ? <SponsorshipConnectSuccess pending /> : null}
      {showConnectSuccess && stripeReady ? <SponsorshipConnectSuccess /> : null}

      {!stripeConfigured ? (
        <p className="text-sm text-amber-300">
          Stripe is not configured on this environment yet.
        </p>
      ) : stripeReady ? (
        <div className="space-y-4">
          <div className="flex gap-2.5">
            <StatusDot tone={payoutsEnabled ? 'ok' : 'warn'} />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-zinc-100">
                {payoutsEnabled ? 'Connected' : 'Connected — finish payout setup'}
              </p>
              <p className="text-sm leading-relaxed text-zinc-400">
                {payoutsEnabled
                  ? 'Session fees and sponsorships go to your Stripe account (5% platform fee on sponsorships), then to your bank on Stripe’s schedule.'
                  : 'Your account can take payments, but Stripe still needs payout details before money can reach your bank.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={payoutsPath}
              className={`${btnPrimary} w-full sm:w-auto`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {payoutsEnabled ? 'Open Stripe' : 'Finish in Stripe'}
            </a>
            <a href={connectPath} className={`${btnOutline} w-full sm:w-auto`}>
              Update account
            </a>
          </div>
        </div>
      ) : hasStripeAccount ? (
        <div className="space-y-3">
          {!showPendingBanner ? (
            <div className="flex gap-2.5">
              <StatusDot tone="warn" />
              <p className="text-sm leading-relaxed text-zinc-400">
                Finish onboarding so this group can collect session fees and sponsorships.
              </p>
            </div>
          ) : null}
          <a href={connectPath} className={`${btnPrimary} w-full sm:w-auto`}>
            Continue setup
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            Connect Stripe Express to collect session fees and monthly sponsorships. Payments go to
            your Stripe balance, then your bank. Organizr keeps a 5% platform fee on sponsorships.
          </p>
          <a href={connectPath} className={`${btnPrimary} w-full sm:w-auto`}>
            Connect Stripe
          </a>
        </div>
      )}
    </div>
  )
}
