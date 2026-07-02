'use client'

import { useState, useTransition } from 'react'
import type { Location } from '@/lib/locations'
import type { Schedule } from '@/lib/schedules'
import { updateSchedule, type UpdateScheduleMode } from '../actions'
import { chipAction } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { ScheduleFormFields } from './schedule-form-fields'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  schedule: Schedule
  locations: Location[]
}

export function EditScheduleButton({ orgSlug, schedule, locations }: Props) {
  const toast = useConsoleToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<UpdateScheduleMode | null>(null)
  const [pending, startTransition] = useTransition()

  function closeModal() {
    if (pending) return
    setOpen(false)
    setMode(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!mode) return
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateSchedule(orgSlug, schedule.id, mode, formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        closeModal()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${chipAction} text-zinc-400 hover:bg-white/5 hover:text-zinc-200`}
      >
        Edit
      </button>

      <BottomSheet
        open={open}
        onClose={closeModal}
        dismissDisabled={pending}
        ariaLabelledby="edit-schedule-title"
      >
        <h3 id="edit-schedule-title" className="text-lg font-semibold text-zinc-50">
          Edit recurring schedule
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Update <span className="font-medium text-zinc-200">{schedule.title}</span>. Choose
          whether changes apply to sessions already on your calendar.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <ScheduleFormFields
                locations={locations}
                schedule={schedule}
                timezone={schedule.timezone}
              />

              <fieldset className="space-y-3 border-t border-white/5 pt-4">
                <legend className="text-sm font-medium text-zinc-200">Apply changes to</legend>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 transition has-[:checked]:border-indigo-500/50 has-[:checked]:bg-indigo-500/5">
                  <input
                    type="radio"
                    name="update-schedule-mode"
                    value="forward_only"
                    checked={mode === 'forward_only'}
                    onChange={() => setMode('forward_only')}
                    className="mt-0.5 shrink-0 accent-indigo-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-zinc-100">New sessions only</span>
                    <span className="mt-0.5 block text-zinc-500">
                      Upcoming sessions already on your calendar stay as they are. New settings
                      apply when sessions roll in.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 transition has-[:checked]:border-indigo-500/50 has-[:checked]:bg-indigo-500/5">
                  <input
                    type="radio"
                    name="update-schedule-mode"
                    value="all_scheduled"
                    checked={mode === 'all_scheduled'}
                    onChange={() => setMode('all_scheduled')}
                    className="mt-0.5 shrink-0 accent-indigo-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-zinc-100">All upcoming sessions</span>
                    <span className="mt-0.5 block text-zinc-500">
                      Updates every future session from this series. Changing days, time, or
                      frequency recreates session times and removes signups on affected sessions.
                    </span>
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !mode}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
      </BottomSheet>
    </>
  )
}
