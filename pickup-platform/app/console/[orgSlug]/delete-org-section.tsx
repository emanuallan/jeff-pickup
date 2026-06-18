'use client'

import { useEffect, useState, useTransition } from 'react'
import { deleteOrg } from '../actions'
import { consoleInput, chipAction, consoleModalBackdrop, consoleModalOverlay, consoleModalPanel } from '../_components/console-ui'
import { normalizeSlug } from '@/lib/tenancy/reserved-slugs'

type Props = {
  orgSlug: string
  rootDomain: string
}

export function DeleteOrgSection({ orgSlug, rootDomain }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const slugMatches = normalizeSlug(confirmSlug) === orgSlug

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) {
        setOpen(false)
        setConfirmSlug('')
        setError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, pending])

  function closeModal() {
    if (pending) return
    setOpen(false)
    setConfirmSlug('')
    setError(null)
  }

  function handleDelete() {
    if (!slugMatches) return
    setError(null)
    startTransition(async () => {
      const result = await deleteOrg(orgSlug, confirmSlug)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <p className="text-sm text-zinc-400">
        Permanently delete this group and all of its data. This cannot be undone.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${chipAction} mt-4 text-red-400 hover:bg-red-500/10 hover:text-red-300`}
      >
        Delete group
      </button>

      {open ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-org-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={closeModal}
          />
          <div className={`${consoleModalPanel} max-w-md border-red-500/30`}>
            <h3 id="delete-org-title" className="text-lg font-semibold text-zinc-50">
              Delete this group?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              All session history and participant history will be erased permanently. The slug{' '}
              <span className="font-medium text-zinc-200">
                {orgSlug}.{rootDomain}
              </span>{' '}
              will become available for anyone to claim again.
            </p>

            <label className="mt-5 block">
              <span className="text-xs font-medium text-zinc-400">
                Type <span className="text-zinc-200">{orgSlug}</span> to confirm
              </span>
              <input
                type="text"
                value={confirmSlug}
                onChange={(e) => {
                  setConfirmSlug(e.target.value)
                  setError(null)
                }}
                autoComplete="off"
                autoFocus
                placeholder={orgSlug}
                className={`mt-1.5 ${consoleInput}`}
              />
            </label>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending || !slugMatches}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
