import type { StripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'

type Props = {
  error: StripeConnectErrorDisplay
}

export function SponsorshipConnectError({ error }: Props) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-medium text-amber-100">{error.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-200/90">{error.message}</p>
      {error.action ? (
        <a
          href={error.action.href}
          className="mt-3 inline-flex text-sm font-medium text-amber-100 underline decoration-amber-100/40 underline-offset-2 hover:text-white hover:decoration-white/60"
          {...(error.action.external
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {error.action.label}
        </a>
      ) : null}
    </div>
  )
}

type SuccessProps = {
  pending?: boolean
}

export function SponsorshipConnectSuccess({ pending = false }: SuccessProps) {
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 ${
        pending
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-emerald-500/30 bg-emerald-500/10'
      }`}
      role="status"
    >
      <p className={`text-sm font-medium ${pending ? 'text-amber-100' : 'text-emerald-100'}`}>
        {pending ? 'Stripe onboarding submitted' : 'Stripe connected'}
      </p>
      <p className={`mt-1 text-sm leading-relaxed ${pending ? 'text-amber-200/90' : 'text-emerald-200/90'}`}>
        {pending
          ? 'Stripe received your details. Payouts usually activate within a few minutes in test mode — refresh this page shortly.'
          : 'Your group can accept monthly sponsors. Open Stripe anytime to view balances and bank payouts.'}
      </p>
    </div>
  )
}
