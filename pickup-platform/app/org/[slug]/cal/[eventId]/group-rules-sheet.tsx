'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { acceptGroupRules } from './group-rules-actions'

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  rulesText: string
  rulesVersion: number
  phone?: string | null
  accent: string
  accentText: string
  onAccepted: () => void | Promise<void>
}

export function GroupRulesSheet({
  open,
  onClose,
  orgSlug,
  rulesText,
  rulesVersion,
  phone,
  accent,
  accentText,
  onAccepted,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setError(null)
    }
  }, [open])

  async function handleAccept() {
    setLoading(true)
    setError(null)
    const result = await acceptGroupRules(orgSlug, rulesVersion, phone ?? undefined)
    if (result.error) {
      setLoading(false)
      setError(result.error)
      return
    }
    await onAccepted()
    setLoading(false)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissDisabled={loading}
      ariaLabelledby="group-rules-title"
    >
      <h2 id="group-rules-title" className="text-lg font-semibold tracking-tight text-zinc-50">
        Group rules
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Please read and accept these rules to continue signing up.
      </p>

      <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
        {rulesText}
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleAccept()}
          className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accent, color: accentText }}
        >
          {loading ? 'Saving…' : 'I agree'}
        </button>
      </div>
    </BottomSheet>
  )
}
