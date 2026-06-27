'use client'

import { useState } from 'react'
import { updateOrgFeatures } from '../actions'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { btnSecondary } from '../_components/console-ui'
import { ORG_FEATURE_DEFINITIONS, type OrgFeatures } from '@/lib/org-features'

type Props = {
  orgSlug: string
  features: OrgFeatures
}

function FeatureToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: keyof OrgFeatures
  label: string
  description: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 transition hover:border-indigo-500/25 hover:bg-zinc-950/70">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{description}</span>
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-zinc-700/90 shadow-inner transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  )
}

export function FeatureTogglesForm({ orgSlug, features }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateOrgFeatures(orgSlug, formData)
    if (result?.error) {
      setIsError(true)
      setMessage(result.error)
      return
    }
    setIsError(false)
    setMessage('Saved. Changes may take a few moments to appear on public pages.')
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {ORG_FEATURE_DEFINITIONS.map((feature) => (
        <FeatureToggle
          key={feature.key}
          name={feature.key}
          label={feature.label}
          description={feature.description}
          defaultChecked={features[feature.key]}
        />
      ))}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-3">
        <ConsoleSubmitButton className={`w-full sm:w-auto ${btnSecondary}`}>
          Save features
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
