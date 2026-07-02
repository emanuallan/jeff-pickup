'use client'

import { useEffect, useState, useTransition } from 'react'
import { updateEventAnnouncement } from '../actions'
import { chipAction, consoleInput } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

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
            placeholder="Shown on the public event page — parking tips, what to bring, etc."
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
        <p className="text-xs font-medium text-zinc-500">Announcement</p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{announcement}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={openEditor}
            disabled={pending}
            className={`${chipAction} text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:opacity-50`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
          >
            {pending ? 'Removing…' : 'Remove'}
          </button>
        </div>
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
