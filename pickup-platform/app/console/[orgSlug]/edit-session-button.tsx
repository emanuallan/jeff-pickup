'use client'

import { useState } from 'react'
import type { Location } from '@/lib/locations'
import type { EventWithLocation } from '@/lib/events'
import { sessionFormInitialFromEvent } from '@/lib/session-form-values'
import { SessionForm } from './session-form'
import { chipAction } from '../_components/console-ui'
import { BottomSheet } from '@/app/_components/bottom-sheet'

export function EditSessionButton({
  orgSlug,
  event,
  locations,
  updateSession,
}: {
  orgSlug: string
  event: EventWithLocation
  locations: Location[]
  updateSession: (
    orgSlug: string,
    eventId: string,
    formData: FormData,
  ) => Promise<{ ok: true } | { error: string }>
}) {
  const [open, setOpen] = useState(false)
  const boundUpdate = updateSession.bind(null, orgSlug, event.short_id)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${chipAction} text-zinc-300 hover:bg-white/5 hover:text-zinc-100`}
      >
        Edit
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabelledby="edit-session-title"
      >
        <h2 id="edit-session-title" className="text-lg font-semibold text-zinc-50">
          Edit session
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {event.schedule_id
            ? 'Changes apply to this session only — your recurring schedule is unchanged.'
            : 'Update this one-off session.'}
        </p>
        <div className="mt-5">
          <SessionForm
            key={event.id}
            locations={locations}
            initial={sessionFormInitialFromEvent(event)}
            onSubmit={boundUpdate}
            onSuccess={() => setOpen(false)}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            useBrowserTimezone={false}
          />
        </div>
      </BottomSheet>
    </>
  )
}
