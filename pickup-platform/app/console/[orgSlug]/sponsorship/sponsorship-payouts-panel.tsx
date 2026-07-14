import { btnOutline, btnPrimary } from '../../_components/console-ui'
import { SponsorshipConnectError, SponsorshipConnectSuccess } from './sponsorship-connect-error'
import { SponsorshipDisconnectButton } from './sponsorship-disconnect-button'
import type { StripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'

type Props = {
  orgSlug: string
  stripeConfigured: boolean
  stripeReady: boolean
  hasStripeAccount: boolean
  payoutsEnabled: boolean
  canDisconnectStripe: boolean
  connectPath: string
  payoutsPath: string
  connectErrorDisplay: StripeConnectErrorDisplay | null
  showConnectSuccess: boolean
  showConnectPending: boolean
}

export function SponsorshipPayoutsPanel({
  orgSlug,
  stripeConfigured,
  stripeReady,
  hasStripeAccount,
  payoutsEnabled,
  canDisconnectStripe,
  connectPath,
  payoutsPath,
  connectErrorDisplay,
  showConnectSuccess,
  showConnectPending,
}: Props) {
  return (
    <div className="space-y-4">
      {connectErrorDisplay ? <SponsorshipConnectError error={connectErrorDisplay} /> : null}
      {showConnectSuccess ? (
        <SponsorshipConnectSuccess pending={showConnectPending && !stripeReady} />
      ) : null}

      {!stripeConfigured ? (
        <p className="text-sm text-amber-300">
          Stripe is not configured on this environment yet.
        </p>
      ) : stripeReady ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5">
            <p className="text-sm font-medium text-emerald-100">Where your money goes</p>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/85">
              Sponsor payments land in your connected Stripe account (after Organizr&apos;s 5%
              platform fee). Stripe then pays out to your bank on its normal schedule — open Stripe
              to check your balance, payouts, and bank details.
            </p>
            {!payoutsEnabled ? (
              <p className="mt-2 text-sm leading-relaxed text-amber-200/90">
                Stripe still needs payout details finished before money can leave for your bank.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={payoutsPath}
              className={`${btnPrimary} w-full sm:w-auto`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {payoutsEnabled ? 'Open Stripe for payouts' : 'Finish payout setup in Stripe'}
            </a>
            <a href={connectPath} className={`${btnOutline} w-full sm:w-auto`}>
              Update Stripe account details
            </a>
            {canDisconnectStripe ? (
              <SponsorshipDisconnectButton orgSlug={orgSlug} canDisconnect />
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Opens your Stripe Express dashboard in a new tab. Balances and bank payouts are managed
            there — not inside Organizr.
          </p>
          {!canDisconnectStripe ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Cancel or decline all active and pending sponsorships to disconnect Stripe.
            </p>
          ) : null}
        </div>
      ) : hasStripeAccount ? (
        <div className="space-y-3">
          {!showConnectSuccess ? (
            <p className="text-sm leading-relaxed text-amber-300">
              Finish Stripe onboarding to accept sponsors and receive payouts to your bank.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a href={connectPath} className={`${btnPrimary} w-full sm:w-auto`}>
              Continue Stripe payout setup
            </a>
            {canDisconnectStripe ? (
              <SponsorshipDisconnectButton orgSlug={orgSlug} canDisconnect />
            ) : (
              <p className="text-xs leading-relaxed text-zinc-500 sm:self-center">
                Cancel or decline all active and pending sponsorships to disconnect Stripe.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!showConnectSuccess ? (
            <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5">
              <p className="text-sm font-medium text-zinc-100">Connect Stripe to get paid</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Sponsorships use Stripe Connect. Once connected, monthly sponsor payments are
                deposited to your Stripe balance, then paid out to the bank account you add in
                Stripe. Organizr keeps a 5% platform fee.
              </p>
            </div>
          ) : null}
          <a href={connectPath} className={`${btnPrimary} w-full sm:w-auto`}>
            Connect Stripe for payouts
          </a>
        </div>
      )}
    </div>
  )
}
