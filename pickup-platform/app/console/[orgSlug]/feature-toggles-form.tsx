'use client'

import { useState } from 'react'
import { updateOrgFeatures } from '../actions'
import { btnSecondary } from '../_components/console-ui'
import { ORG_FEATURE_DEFINITIONS, type OrgFeatures } from '@/lib/org-features'

type Props = {
  orgSlug: string
  features: OrgFeatures
}

export function FeatureTogglesForm({ orgSlug, features }: Props) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateOrgFeatures(orgSlug, formData)
    setMessage(result?.error ? result.error : 'Saved.')
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {ORG_FEATURE_DEFINITIONS.map((feature) => (
        <label
          key={feature.key}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-3 transition hover:border-white/15"
        >
          <input
            type="checkbox"
            name={feature.key}
            defaultChecked={features[feature.key]}
            className="mt-0.5 size-4 shrink-0 rounded border-white/20 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/40"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-100">{feature.label}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
              {feature.description}
            </span>
          </span>
        </label>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button type="submit" className={`w-full sm:w-auto ${btnSecondary}`}>
          Save features
        </button>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
      </div>
    </form>
  )
}
