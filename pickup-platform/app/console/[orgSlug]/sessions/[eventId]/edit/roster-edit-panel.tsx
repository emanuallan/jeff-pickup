'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from '@/app/_components/phone-input'
import type { OrgParticipantHistory } from '@/lib/participants'
import type { SignupWithContact } from '@/lib/signups'
import { formatPhoneDisplay } from '@/lib/phone'
import { formatGuestSuffix } from '@/lib/format-guest-suffix'
import {
  consoleGuestCountOptionLabel,
  consoleGuestCountOptions,
} from '@/lib/console/guest-count'
import {
  ConsoleCard,
  ConsoleSection,
  consoleInput,
  consoleLabel,
  btnPrimary,
  chipAction,
} from '../../../../_components/console-ui'
import { ConsoleSubmitButton } from '../../../../_components/console-submit-button'
import { useConsoleToast } from '../../../../_components/console-toast'
import {
  addExistingSessionRosterSignup,
  addSessionRosterSignup,
  promoteSessionWaitlistSignup,
  removeSessionRosterSignup,
  updateSessionRosterGuestCount,
} from './roster-actions'

type Props = {
  orgSlug: string
  eventRef: string
  guestsEnabled: boolean
  waitlistEnabled: boolean
  capacity: number | null
  headcount: number
  confirmed: SignupWithContact[]
  waitlisted: SignupWithContact[]
  availableParticipants: OrgParticipantHistory[]
}

function RosterRow({
  entry,
  guestsEnabled,
  waitlistPosition,
  onRemove,
  onPromote,
  onGuestCountChange,
}: {
  entry: SignupWithContact
  guestsEnabled: boolean
  waitlistPosition?: number
  onRemove: () => Promise<void>
  onPromote?: () => Promise<void>
  onGuestCountChange?: (count: number) => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [guestPending, setGuestPending] = useState(false)

  async function handleRemove() {
    const label = entry.display_name
    if (!window.confirm(`Remove ${label} from this session?`)) {
      return
    }
    setPending(true)
    await onRemove()
    setPending(false)
  }

  async function handlePromote() {
    if (!onPromote) return
    setPending(true)
    await onPromote()
    setPending(false)
  }

  return (
    <ConsoleCard className="text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium text-zinc-100">
            {entry.display_name}
            {formatGuestSuffix(entry.guest_count)}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {entry.first_name} {entry.last_name} · {formatPhoneDisplay(entry.phone)}
          </div>
          {waitlistPosition != null ? (
            <div className="mt-1 text-xs text-amber-300/90">#{waitlistPosition} on waitlist</div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {guestsEnabled && onGuestCountChange ? (
            <label className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Guests</span>
              <select
                value={entry.guest_count}
                disabled={guestPending || pending}
                onChange={(event) => {
                  const count = Number.parseInt(event.target.value, 10)
                  setGuestPending(true)
                  void onGuestCountChange(count).finally(() => setGuestPending(false))
                }}
                className="rounded-lg border border-white/10 bg-zinc-950/60 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25"
              >
                {consoleGuestCountOptions().map((count) => (
                  <option key={count} value={count}>
                    {consoleGuestCountOptionLabel(count)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {onPromote ? (
            <button
              type="button"
              onClick={() => void handlePromote()}
              disabled={pending}
              className={`${chipAction} text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:opacity-50`}
            >
              {pending ? 'Promoting…' : 'Promote'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={pending}
            className={`${chipAction} text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50`}
          >
            {pending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </ConsoleCard>
  )
}

export function RosterEditPanel({
  orgSlug,
  eventRef,
  guestsEnabled,
  waitlistEnabled,
  capacity,
  headcount,
  confirmed,
  waitlisted,
  availableParticipants,
}: Props) {
  const router = useRouter()
  const toast = useConsoleToast()
  const [, startTransition] = useTransition()
  const [addError, setAddError] = useState<string | null>(null)
  const [quickAddId, setQuickAddId] = useState('')
  const [quickAddPending, setQuickAddPending] = useState(false)

  const capacityLabel = useMemo(() => {
    if (capacity == null) {
      return `${headcount} coming`
    }
    return `${headcount} / ${capacity} coming`
  }, [capacity, headcount])

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function runAction(action: () => Promise<{ ok: true } | { error: string }>, success: string) {
    const result = await action()
    if ('error' in result) {
      toast.error(result.error)
      return false
    }
    toast.success(success)
    refresh()
    return true
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddError(null)
    const formData = new FormData(event.currentTarget)
    const result = await addSessionRosterSignup(orgSlug, eventRef, formData)
    if ('error' in result) {
      setAddError(result.error)
      return
    }
    toast.success('Participant added.')
    event.currentTarget.reset()
    refresh()
  }

  async function handleQuickAdd() {
    if (!quickAddId) return
    setQuickAddPending(true)
    const ok = await runAction(
      () => addExistingSessionRosterSignup(orgSlug, eventRef, quickAddId, 0),
      'Participant added.',
    )
    setQuickAddPending(false)
    if (ok) {
      setQuickAddId('')
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-zinc-400">{capacityLabel}</p>

      <ConsoleSection title={`Roster (${confirmed.length})`}>
        {confirmed.length === 0 ? (
          <p className="text-sm text-zinc-500">No one on the roster yet.</p>
        ) : (
          <ul className="space-y-2">
            {confirmed.map((entry) => (
              <li key={entry.id}>
                <RosterRow
                  entry={entry}
                  guestsEnabled={guestsEnabled}
                  onRemove={async () => {
                    await runAction(
                      () => removeSessionRosterSignup(orgSlug, eventRef, entry.id),
                      'Participant removed.',
                    )
                  }}
                  onGuestCountChange={async (count) => {
                    await runAction(
                      () => updateSessionRosterGuestCount(orgSlug, eventRef, entry.id, count),
                      'Guest count updated.',
                    )
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </ConsoleSection>

      {waitlistEnabled ? (
        <ConsoleSection title={`Waitlist (${waitlisted.length})`}>
          {waitlisted.length === 0 ? (
            <p className="text-sm text-zinc-500">No one on the waitlist.</p>
          ) : (
            <ul className="space-y-2">
              {waitlisted.map((entry, index) => (
                <li key={entry.id}>
                  <RosterRow
                    entry={entry}
                    guestsEnabled={guestsEnabled}
                    waitlistPosition={index + 1}
                    onPromote={async () => {
                      await runAction(
                        () => promoteSessionWaitlistSignup(orgSlug, eventRef, entry.id),
                        'Moved to roster.',
                      )
                    }}
                    onRemove={async () => {
                      await runAction(
                        () => removeSessionRosterSignup(orgSlug, eventRef, entry.id),
                        'Participant removed.',
                      )
                    }}
                    onGuestCountChange={async (count) => {
                      await runAction(
                        () => updateSessionRosterGuestCount(orgSlug, eventRef, entry.id, count),
                        'Guest count updated.',
                      )
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </ConsoleSection>
      ) : null}

      {availableParticipants.length > 0 ? (
        <ConsoleSection
          title="Add existing participant"
          description="Pick someone who has joined a session before."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className={consoleLabel}>Participant</span>
              <select
                value={quickAddId}
                onChange={(event) => setQuickAddId(event.target.value)}
                className={`${consoleInput} mt-1`}
              >
                <option value="">Select a participant…</option>
                {availableParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.display_name} · {formatPhoneDisplay(participant.phone)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleQuickAdd()}
              disabled={!quickAddId || quickAddPending}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              {quickAddPending ? 'Adding…' : 'Add to session'}
            </button>
          </div>
        </ConsoleSection>
      ) : null}

      <ConsoleSection
        title="Add participant"
        description={
          waitlistEnabled && capacity != null && headcount >= capacity
            ? 'This session is full — new sign-ups will go to the waitlist unless you choose otherwise.'
            : 'Create or match a participant by phone number.'
        }
      >
        <form onSubmit={(event) => void handleAdd(event)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={consoleLabel}>First name</span>
              <input name="first_name" required autoComplete="given-name" className={`${consoleInput} mt-1`} />
            </label>
            <label className="block">
              <span className={consoleLabel}>Last name</span>
              <input name="last_name" required autoComplete="family-name" className={`${consoleInput} mt-1`} />
            </label>
          </div>

          <label className="block">
            <span className={consoleLabel}>Phone</span>
            <div className="mt-1">
              <PhoneInput className={consoleInput} />
            </div>
          </label>

          {guestsEnabled ? (
            <label className="block">
              <span className={consoleLabel}>Guests</span>
              <select name="guest_count" defaultValue={0} className={`${consoleInput} mt-1`}>
                {consoleGuestCountOptions().map((count) => (
                  <option key={count} value={count}>
                    {consoleGuestCountOptionLabel(count)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="guest_count" value={0} />
          )}

          {waitlistEnabled ? (
            <label className="block">
              <span className={consoleLabel}>Placement</span>
              <select name="list_status" defaultValue="auto" className={`${consoleInput} mt-1`}>
                <option value="auto">Auto (roster or waitlist)</option>
                <option value="confirmed">Roster</option>
                <option value="waitlisted">Waitlist</option>
              </select>
            </label>
          ) : (
            <input type="hidden" name="list_status" value="confirmed" />
          )}

          {addError ? <p className="text-sm text-red-300">{addError}</p> : null}

          <ConsoleSubmitButton pendingLabel="Adding…" className={btnPrimary}>
            Add participant
          </ConsoleSubmitButton>
        </form>
      </ConsoleSection>
    </div>
  )
}
