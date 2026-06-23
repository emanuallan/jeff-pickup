'use client'

import { useEffect, useState, useTransition } from 'react'
import { deleteSchedule, type DeleteScheduleMode } from '../actions'
import type { ScheduleDeleteImpact } from '@/lib/schedules'
import { chipAction, consoleModalBackdrop, consoleModalOverlay, consoleModalPanel } from '../_components/console-ui'

type Props = {
  orgSlug: string
  scheduleId: string
  scheduleTitle: string
  impact: ScheduleDeleteImpact
}

export function DeleteScheduleButton({ orgSlug, scheduleId, scheduleTitle, impact }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DeleteScheduleMode>('schedule_only')
  const [acknowledgeSignupLoss, setAcknowledgeSignupLoss] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const needsSignupAck =
    mode === 'with_future_events' && impact.signupCount > 0

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) {
        closeModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, pending])

  function openModal() {
    setMode('schedule_only')
    setAcknowledgeSignupLoss(false)
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (pending) return
    setOpen(false)
    setMode('schedule_only')
    setAcknowledgeSignupLoss(false)
    setError(null)
  }

  function handleDelete() {
    if (!mode) return
    if (needsSignupAck && !acknowledgeSignupLoss) return
    setError(null)
    startTransition(async () => {
      const result = await deleteSchedule(orgSlug, scheduleId, mode, {
        acknowledgeSignupLoss: needsSignupAck ? acknowledgeSignupLoss : undefined,
      })
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        closeModal()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300`}
      >
        Delete
      </button>

      {open ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-schedule-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={closeModal}
          />
          <div className={`${consoleModalPanel} max-w-md border-red-500/30`}>
            <h3 id="delete-schedule-title" className="text-lg font-semibold text-zinc-50">
              Delete recurring schedule?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              <span className="font-medium text-zinc-200">{scheduleTitle}</span> will stop
              generating new sessions. Choose what to do with sessions already on your calendar.
            </p>

            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Delete options</legend>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 transition has-[:checked]:border-indigo-500/50 has-[:checked]:bg-indigo-500/5">
                <input
                  type="radio"
                  name="delete-schedule-mode"
                  value="schedule_only"
                  checked={mode === 'schedule_only'}
                  onChange={() => {
                    setMode('schedule_only')
                    setAcknowledgeSignupLoss(false)
                    setError(null)
                  }}
                  className="mt-0.5 shrink-0 accent-indigo-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-zinc-100">Remove schedule only</span>
                  <span className="mt-0.5 block text-zinc-500">
                    Recommended. Upcoming sessions stay on your calendar as one-offs with their
                    sign-ups intact. No new sessions will be created.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 transition has-[:checked]:border-red-500/50 has-[:checked]:bg-red-500/5">
                <input
                  type="radio"
                  name="delete-schedule-mode"
                  value="with_future_events"
                  checked={mode === 'with_future_events'}
                  onChange={() => {
                    setMode('with_future_events')
                    setAcknowledgeSignupLoss(false)
                    setError(null)
                  }}
                  className="mt-0.5 shrink-0 accent-red-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-zinc-100">
                    Remove schedule and all upcoming sessions
                  </span>
                  <span className="mt-0.5 block text-zinc-500">
                    Permanently deletes every upcoming session from this series — including the
                    next one on your calendar — and all sign-ups on those sessions.
                  </span>
                </span>
              </label>
            </fieldset>

            {mode === 'with_future_events' && impact.upcomingEventCount > 0 ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-100">
                <p className="font-medium">
                  {impact.upcomingEventCount} upcoming session
                  {impact.upcomingEventCount === 1 ? '' : 's'} will be deleted
                  {impact.headcount > 0
                    ? `, including ${impact.headcount} signed-up player${impact.headcount === 1 ? '' : 's'}`
                    : ''}
                  .
                </p>
                {impact.nextEventLabel ? (
                  <p className="mt-1 text-red-200/90">
                    Next up: {impact.nextEventLabel}
                    {impact.nextEventSignupCount > 0
                      ? ` (${impact.nextEventSignupCount} sign-up${impact.nextEventSignupCount === 1 ? '' : 's'})`
                      : ''}
                  </p>
                ) : null}
              </div>
            ) : null}

            {needsSignupAck ? (
              <label className="mt-4 flex cursor-pointer gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={acknowledgeSignupLoss}
                  onChange={(e) => {
                    setAcknowledgeSignupLoss(e.target.checked)
                    setError(null)
                  }}
                  className="mt-0.5 shrink-0 accent-red-500"
                />
                <span>
                  I understand this will permanently delete {impact.headcount} signed-up player
                  {impact.headcount === 1 ? '' : 's'} across these sessions.
                </span>
              </label>
            ) : null}

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
                disabled={pending || !mode || (needsSignupAck && !acknowledgeSignupLoss)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
