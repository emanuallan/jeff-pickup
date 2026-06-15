'use client'

import { useState } from 'react'
import { materializeOrgEvents } from '../actions'

export function MaterializeButton({ orgSlug }: { orgSlug: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    const result = await materializeOrgEvents(orgSlug)
    setLoading(false)
    if (result?.error) {
      setMessage(result.error)
    } else if (result?.ok) {
      setMessage(`Created ${result.count ?? 0} new session(s).`)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh sessions'}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        Sessions are normally generated automatically every day. Use this only if the
        next 30 days look out of date. Safe to run again — duplicates are skipped.
      </p>
      {message ? (
        <p className={`mt-2 text-sm ${message.includes('Add SUPABASE') ? 'text-amber-300' : 'text-emerald-300'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
