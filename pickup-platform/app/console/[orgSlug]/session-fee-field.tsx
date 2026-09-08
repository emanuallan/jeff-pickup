'use client'

import { useState } from 'react'
import {
  sessionFeeOrganizerPayoutHint,
  STRIPE_PROCESSING_FEES_URL,
} from '@/lib/session-payment'
import { consoleInput } from '../_components/console-ui'

function priceCentsFromDollarsInput(raw: string): number | null {
  const dollars = Number.parseFloat(raw.trim())
  if (!Number.isFinite(dollars) || dollars <= 0) return null
  return Math.round(dollars * 100)
}

type Props = {
  defaultPriceCents?: number | null
  labelClassName?: string
}

export function SessionFeeField({
  defaultPriceCents = null,
  labelClassName = 'text-xs text-zinc-500',
}: Props) {
  const [priceDollars, setPriceDollars] = useState(
    defaultPriceCents != null && defaultPriceCents > 0
      ? (defaultPriceCents / 100).toFixed(2)
      : '',
  )

  return (
    <div className="block">
      <label className="block">
        <span className={labelClassName}>Session fee (optional)</span>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
            $
          </span>
          <input
            name="price_cents"
            type="number"
            min={0}
            step="0.01"
            placeholder="Free"
            value={priceDollars}
            onChange={(event) => setPriceDollars(event.target.value)}
            className={`${consoleInput} pl-7`}
            aria-describedby="session-fee-payout-hint"
          />
        </div>
      </label>
      <p id="session-fee-payout-hint" className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        {sessionFeeOrganizerPayoutHint(priceCentsFromDollarsInput(priceDollars))}{' '}
        <a
          href={STRIPE_PROCESSING_FEES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-zinc-300"
        >
          See Stripe fees
        </a>
        .
      </p>
    </div>
  )
}
