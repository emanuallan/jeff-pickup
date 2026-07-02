'use client'

import { useState } from 'react'
import type { Location } from '@/lib/locations'
import { consoleInput, btnSecondary } from '../_components/console-ui'
import { ConsoleSubmitButton } from '../_components/console-submit-button'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  location?: Location
  saveLocation: (
    formData: FormData,
  ) => Promise<void | { error?: string } | { ok: true } | { error: string }>
  onSuccess?: () => void
  submitLabel?: string
  pendingLabel?: string
}

export function LocationForm({
  location,
  saveLocation,
  onSuccess,
  submitLabel = 'Add location',
  pendingLabel = 'Adding…',
}: Props) {
  const toast = useConsoleToast()
  const [isOnline, setIsOnline] = useState(location?.is_online ?? false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await saveLocation(formData)
    setPending(false)
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      toast.error(result.error)
      return
    }
    onSuccess?.()
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="flex rounded-lg border border-white/10 p-1 text-xs">
        <button
          type="button"
          onClick={() => setIsOnline(false)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 font-medium transition ${
            !isOnline ? 'bg-indigo-500/20 text-indigo-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          In person
        </button>
        <button
          type="button"
          onClick={() => setIsOnline(true)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 font-medium transition ${
            isOnline ? 'bg-indigo-500/20 text-indigo-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Online
        </button>
      </div>
      <input type="hidden" name="is_online" value={isOnline ? 'true' : 'false'} />

      <input
        name="label"
        required
        defaultValue={location?.label ?? ''}
        placeholder={isOnline ? 'Name (e.g. Zoom room)' : 'Park name'}
        className={consoleInput}
      />

      {isOnline ? (
        <input
          name="meeting_url"
          type="url"
          defaultValue={location?.meeting_url ?? ''}
          placeholder="Meeting link (Zoom, Google Meet, …)"
          className={consoleInput}
        />
      ) : (
        <>
          <input
            name="address"
            defaultValue={location?.address ?? ''}
            placeholder="Street address (optional)"
            className={consoleInput}
          />
          <input
            name="maps_url"
            defaultValue={location?.maps_url ?? ''}
            placeholder="Google Maps link (optional)"
            className={consoleInput}
          />
        </>
      )}

      <ConsoleSubmitButton
        pending={pending}
        pendingLabel={pendingLabel}
        className={`w-full sm:w-auto ${btnSecondary}`}
      >
        {submitLabel}
      </ConsoleSubmitButton>
    </form>
  )
}
