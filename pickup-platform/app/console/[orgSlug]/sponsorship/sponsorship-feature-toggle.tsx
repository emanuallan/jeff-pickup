'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSponsorshipFeature } from '../../sponsorship-actions'
import { useConsoleToast } from '../../_components/console-toast'

export function SponsorshipFeatureToggle({
  orgSlug,
  enabled: initialEnabled,
  locked = false,
}: {
  orgSlug: string
  enabled: boolean
  /** When true, disabling is blocked (active sponsors still running). */
  locked?: boolean
}) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setEnabled(initialEnabled)
  }, [initialEnabled])

  function handleToggle(next: boolean) {
    if (locked && !next) return
    setEnabled(next)
    startTransition(async () => {
      const result = await updateSponsorshipFeature(orgSlug, next)
      if (result?.error) {
        setEnabled(!next)
        toast.error(result.error)
        return
      }
      toast.success(next ? 'Sponsorships enabled.' : 'Sponsorships turned off.')
      router.refresh()
    })
  }

  const disableControl = isPending || (locked && enabled)

  return (
    <label
      className={`flex items-center justify-between gap-4 py-1 transition ${
        disableControl ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      } ${isPending ? 'opacity-70' : ''}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">Enable sponsorships</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
          {locked
            ? 'Locked while you have active sponsors. End those first to turn this off.'
            : 'When on, visitors can sponsor your group and approved logos appear on your public pages.'}
        </span>
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disableControl}
          onChange={(event) => handleToggle(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-zinc-700/90 shadow-inner transition-colors peer-checked:bg-indigo-600 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  )
}
