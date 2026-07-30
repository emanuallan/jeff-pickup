'use client'

import { useId, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import type { AbandonedCheckoutPerson } from '@/lib/session-payment'
import { formatPriceCents } from '@/lib/session-payment'
import { formatGuestSuffix } from '@/lib/format-guest-suffix'
import { ConsoleCard } from '../../../_components/console-ui'

type Props = {
  people: AbandonedCheckoutPerson[]
  timezone: string
}

function formatAbandonedAt(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'UTC',
  })
}

export function AbandonedCheckoutsButton({ people, timezone }: Props) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const count = people.length

  if (count === 0) return null

  const label =
    count === 1
      ? '1 person left checkout early'
      : `${count} people left checkout early`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-left text-xs text-amber-300/90 underline-offset-2 transition hover:text-amber-200 hover:underline"
      >
        {label} — tap to see who
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabelledby={titleId}>
        <h2 id={titleId} className="text-lg font-semibold text-zinc-50">
          Left checkout early ({count})
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Started paying but didn&apos;t finish. People who later completed checkout are not listed.
        </p>

        <ul className="mt-4 space-y-2">
          {people.map((person) => (
            <ConsoleCard key={person.paymentId} className="min-w-0 text-sm">
              <div className="break-words font-medium text-zinc-100">
                {person.displayName}
                {formatGuestSuffix(person.guestCount)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {[person.firstName, person.lastName].filter(Boolean).join(' ') || '—'}
                {person.phone ? ` · ${person.phone}` : ''}
              </div>
              <div className="mt-0.5 text-xs text-zinc-600">
                {formatPriceCents(person.amountCents)} · started{' '}
                {formatAbandonedAt(person.abandonedAt, timezone)}
              </div>
            </ConsoleCard>
          ))}
        </ul>
      </BottomSheet>
    </>
  )
}
