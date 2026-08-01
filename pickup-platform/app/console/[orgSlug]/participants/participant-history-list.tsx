'use client'

import { useMemo, useState } from 'react'
import type { OrgParticipantHistory } from '@/lib/participants'
import { formatPhoneDisplay } from '@/lib/phone'
import { ConsoleCard, EmptyState, consoleInput } from '../../_components/console-ui'

export function ParticipantHistoryList({
  participants,
}: {
  participants: OrgParticipantHistory[]
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) => {
      const haystack = [
        p.display_name,
        p.first_name,
        p.last_name,
        p.phone,
        formatPhoneDisplay(p.phone),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [participants, query])

  if (participants.length === 0) {
    return (
      <EmptyState
        title="No participants yet"
        description="They’ll appear here after someone joins a session."
      />
    )
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Search participants</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          className={consoleInput}
          autoComplete="off"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No matches for “{query.trim()}”.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <ConsoleCard className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-100">{p.display_name}</div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {p.first_name} {p.last_name}
                    </div>
                    <a
                      href={`tel:${p.phone}`}
                      className="mt-1 inline-block text-xs text-indigo-300 transition-colors hover:text-indigo-200"
                    >
                      {formatPhoneDisplay(p.phone)}
                    </a>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums text-zinc-100">
                      {p.session_count}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      {p.session_count === 1 ? 'session' : 'sessions'}
                    </div>
                  </div>
                </div>
              </ConsoleCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
