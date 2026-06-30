'use client'

import { useState } from 'react'
import { updateOrgWaitlistSettings } from '../actions'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { btnSecondary } from '../_components/console-ui'
import type { OrgWaitlistSettings, WaitlistPromotionMode } from '@/lib/org-features'

type Props = {
  orgSlug: string
  waitlist: OrgWaitlistSettings
}

const OPTIONS: {
  value: WaitlistPromotionMode
  label: string
  description: string
}[] = [
  {
    value: 'strict_fifo',
    label: 'Hold the line',
    description:
      'Promote only from the front of the waitlist. If the first person’s party does not fit the open spots, no one behind them is promoted yet.',
  },
  {
    value: 'skip_ahead',
    label: 'Fill open spots',
    description:
      'Scan the waitlist in order and promote anyone whose party fits the open spots, even if someone ahead of them is waiting for more room.',
  },
]

export function WaitlistSettingsForm({ orgSlug, waitlist }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateOrgWaitlistSettings(orgSlug, formData)
    if (result?.error) {
      setIsError(true)
      setMessage(result.error)
      return
    }
    setIsError(false)
    setMessage('Saved.')
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 transition hover:border-indigo-500/25 hover:bg-zinc-950/70"
        >
          <input
            type="radio"
            name="promotion_mode"
            value={option.value}
            defaultChecked={waitlist.promotion_mode === option.value}
            className="mt-1 shrink-0 accent-indigo-500"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-100">{option.label}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
              {option.description}
            </span>
          </span>
        </label>
      ))}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-3">
        <ConsoleSubmitButton className={`w-full sm:w-auto ${btnSecondary}`}>
          Save waitlist settings
        </ConsoleSubmitButton>
        {message ? (
          <span className={`text-xs leading-relaxed ${isError ? 'text-red-400' : 'text-zinc-400'}`}>
            {message}
          </span>
        ) : null}
      </div>
    </form>
  )
}
