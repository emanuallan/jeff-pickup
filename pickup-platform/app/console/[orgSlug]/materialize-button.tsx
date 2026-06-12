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
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate next 30 days of sessions'}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        Creates event instances from your recurring schedule. Safe to run again — duplicates are skipped.
      </p>
      {message ? (
        <p className={`mt-2 text-sm ${message.includes('Add SUPABASE') ? 'text-amber-300' : 'text-emerald-300'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
