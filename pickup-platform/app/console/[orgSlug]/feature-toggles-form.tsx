'use client'

import { useState } from 'react'
import { updateOrgFeatures } from '../actions'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { btnSecondary } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'
import {
  ORG_FEATURE_GROUPS,
  orgFeatureChildren,
  orgFeatureDefinition,
  type OrgFeatures,
} from '@/lib/org-features'

type Props = {
  orgSlug: string
  features: OrgFeatures
}

function FeatureToggle({
  name,
  label,
  description,
  checked,
  disabled,
  nested,
  onCheckedChange,
}: {
  name: keyof OrgFeatures
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  nested?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      className={[
        'flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition',
        nested ? 'border-white/5 bg-zinc-950/25' : 'border-white/10 bg-zinc-950/40',
        disabled
          ? 'cursor-not-allowed opacity-55'
          : 'cursor-pointer hover:border-indigo-500/25 hover:bg-zinc-950/70',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{description}</span>
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        {/* Disabled checkboxes are omitted from FormData — keep the value when nested under an off parent. */}
        {disabled && checked ? <input type="hidden" name={name} value="on" /> : null}
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-zinc-700/90 shadow-inner transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950 peer-disabled:bg-zinc-800"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-disabled:bg-zinc-300"
        />
      </span>
    </label>
  )
}

function FeatureBranch({
  featureKey,
  enabled,
  onToggle,
}: {
  featureKey: keyof OrgFeatures
  enabled: OrgFeatures
  onToggle: (key: keyof OrgFeatures, checked: boolean) => void
}) {
  const feature = orgFeatureDefinition(featureKey)
  const children = orgFeatureChildren(featureKey)
  const parentOff = Boolean(feature.dependsOn && !enabled[feature.dependsOn])

  return (
    <div className="space-y-2">
      <FeatureToggle
        name={feature.key}
        label={feature.label}
        description={feature.description}
        checked={enabled[feature.key]}
        disabled={parentOff}
        nested={Boolean(feature.dependsOn)}
        onCheckedChange={(checked) => onToggle(feature.key, checked)}
      />
      {children.length > 0 ? (
        <div className="space-y-2 border-l border-white/10 pl-3 sm:pl-4">
          {children.map((child) => (
            <FeatureBranch
              key={child.key}
              featureKey={child.key}
              enabled={enabled}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FeatureTogglesForm({ orgSlug, features }: Props) {
  const toast = useConsoleToast()
  const [enabled, setEnabled] = useState(features)

  function handleToggle(key: keyof OrgFeatures, checked: boolean) {
    setEnabled((current) => ({ ...current, [key]: checked }))
  }

  async function handleSubmit(formData: FormData) {
    const result = await updateOrgFeatures(orgSlug, formData)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Saved. Changes may take a few moments to appear on public pages.')
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {ORG_FEATURE_GROUPS.map((group) => (
        <fieldset key={group.id} className="space-y-3">
          <legend className="w-full">
            <span className="block text-sm font-medium text-zinc-200">{group.title}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
              {group.description}
            </span>
          </legend>
          <div className="space-y-2 pt-1">
            {group.features.map((featureKey) => (
              <FeatureBranch
                key={featureKey}
                featureKey={featureKey}
                enabled={enabled}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="pt-1">
        <ConsoleSubmitButton className={`w-full sm:w-auto ${btnSecondary}`}>
          Save features
        </ConsoleSubmitButton>
      </div>
    </form>
  )
}
