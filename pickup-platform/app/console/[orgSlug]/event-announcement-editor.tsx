'use client'

import { useEffect, useState, useTransition } from 'react'
import { updateEventAnnouncement } from '../actions'
import { chipAction, consoleInput } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 disabled:opacity-50'

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 6V4h8v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type Props = {
  orgSlug: string
  eventId: string
  announcement: string
}

export function EventAnnouncementEditor({ orgSlug, eventId, announcement: initial }: Props) {
  const toast = useConsoleToast()
  const [announcement, setAnnouncement] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setAnnouncement(initial)
    setDraft(initial)
  }, [initial])

  function openEditor() {
    setDraft(announcement)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(announcement)
    setEditing(false)
  }

  function save() {
    startTransition(async () => {
      const result = await updateEventAnnouncement(orgSlug, eventId, draft)
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }
      const next = draft.trim()
      setAnnouncement(next)
      setDraft(next)
      setEditing(false)
      toast.success('Saved.')
    })
  }

  function remove() {
    if (pending) return
    startTransition(async () => {
      const result = await updateEventAnnouncement(orgSlug, eventId, '')
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }
      setAnnouncement('')
      setDraft('')
      setEditing(false)
      toast.success('Announcement removed.')
    })
  }

  if (editing) {
    return (
      <div className="mt-2.5 border-t border-white/5 pt-2.5">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Announcement</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={pending}
            placeholder="Shown above the event on your public page — last-minute updates, cancellations, etc."
            className={`mt-1 ${consoleInput} resize-y`}
          />
        </label>
        <p className="mt-1 text-[11px] text-zinc-600">{draft.length}/500</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/10 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={pending}
            className={`${chipAction} text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50`}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (announcement) {
    return (
      <div className="mt-2.5 border-t border-white/5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500">Announcement</p>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={openEditor}
              disabled={pending}
              aria-label="Edit announcement"
              className={`${iconButtonClass} hover:text-indigo-300`}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label="Remove announcement"
              className={`${iconButtonClass} hover:bg-red-500/10 hover:text-red-300`}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
          {announcement}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2.5 border-t border-white/5 pt-2">
      <button
        type="button"
        onClick={openEditor}
        className={`${chipAction} text-zinc-400 hover:bg-white/5 hover:text-zinc-200`}
      >
        Add announcement
      </button>
    </div>
  )
}
