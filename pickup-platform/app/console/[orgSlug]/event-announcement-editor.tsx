'use client'

import { useEffect, useState, useTransition } from 'react'
import { updateEventAnnouncement } from '../actions'
import { chipAction, consoleInput } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  eventId: string
  announcement: string
  readOnly?: boolean
}

export function EventAnnouncementEditor({
  orgSlug,
  eventId,
  announcement: initial,
  readOnly = false,
}: Props) {
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

  if (readOnly) {
    if (!announcement.trim()) return null
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
          Announcement
        </p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
          {announcement}
        </p>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-3 py-2.5">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200/80">
            Announcement
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={pending}
            placeholder="Shown on your public session page — last-minute updates, weather, etc."
            className={`mt-2 ${consoleInput} resize-y`}
            autoFocus
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
            {pending ? 'Saving…' : 'Save announcement'}
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
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
            Announcement
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={openEditor}
              disabled={pending}
              className={`${chipAction} -mr-1 -mt-1 min-h-8 py-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className={`${chipAction} -mr-1 -mt-1 min-h-8 py-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
            >
              {pending ? 'Removing…' : 'Remove'}
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
    <button
      type="button"
      onClick={openEditor}
      className="w-full rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-left text-xs text-zinc-500 transition hover:border-white/15 hover:bg-white/[0.02] hover:text-zinc-400"
    >
      + Add announcement
    </button>
  )
}
