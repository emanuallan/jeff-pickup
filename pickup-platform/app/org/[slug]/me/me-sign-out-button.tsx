'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clearParticipantDeviceSession } from '@/lib/participant-session-client'

type Props = {
  accent: string
}

export function MeSignOutButton({ accent }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function onSignOut() {
    setError(null)
    const cleared = await clearParticipantDeviceSession()
    if ('error' in cleared) {
      setError(cleared.error)
      return
    }

    startTransition(() => {
      router.replace('/')
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSignOut}
        disabled={pending}
        className="w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900/50 hover:text-zinc-100 disabled:opacity-60"
        style={{ borderColor: `${accent}33` }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
