'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { hexToRgba } from '@/lib/colors'
import type { ParticipantNotificationPayload } from '@/lib/participant-notifications'
import type { SessionDebriefState, SessionDebriefStep } from '@/lib/session-debrief'
import {
  debriefStepCount,
  debriefStepIndex,
  debriefStepTitle,
  nextDebriefStep,
  previousDebriefStep,
  resolveInitialDebriefStep,
} from '@/lib/session-debrief'
import {
  getSessionDebriefState,
  skipSessionDebriefStep,
  submitSessionMvpVote,
  submitSessionPlayerStats,
} from '../participant-notification-actions'
import { SessionFeedbackStep } from './session-feedback-step'

function formatDebriefWhen(startsAt: string): string {
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  eventId: string
  payload: ParticipantNotificationPayload
  accent: string
  onCompleted?: (outcome: 'rated' | 'no_attend' | 'skipped' | 'done') => void
}

function SessionMvpVoteStep({
  state,
  accent,
  loading,
  error,
  selectedNomineeId,
  onSelectNominee,
  onSubmit,
  onSkip,
}: {
  state: SessionDebriefState
  accent: string
  loading: boolean
  error: string | null
  selectedNomineeId: string | null
  onSelectNominee: (id: string) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  if (!state.mvp_voting_open) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          MVP voting is only available for 6 hours after the session ends. You can still share your
          stats and feedback.
        </p>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Who stood out today? Pick one player from the roster.</p>
      <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {state.ballot.map((entry) => {
          const selected = selectedNomineeId === entry.participant_id
          return (
            <li key={entry.participant_id}>
              <button
                type="button"
                disabled={loading}
                onClick={() => onSelectNominee(entry.participant_id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? 'border-indigo-400/50 bg-indigo-500/10 text-zinc-50'
                    : 'border-white/10 bg-zinc-900/40 text-zinc-200 hover:border-white/20'
                }`}
              >
                <span>{entry.display_name}</span>
                {selected ? (
                  <span className="text-xs font-semibold text-indigo-300">Selected</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
      {state.ballot.length === 0 ? (
        <p className="text-sm text-zinc-500">No other players on the roster to vote for.</p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onSkip}
          className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300"
        >
          Skip
        </button>
        <button
          type="button"
          disabled={loading || !selectedNomineeId}
          onClick={onSubmit}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          {loading ? 'Submitting…' : 'Submit vote'}
        </button>
      </div>
    </div>
  )
}

function SessionPlayerStatsStep({
  accent,
  loading,
  error,
  goals,
  assists,
  onGoalsChange,
  onAssistsChange,
  onSubmit,
  onSkip,
}: {
  accent: string
  loading: boolean
  error: string | null
  goals: number
  assists: number
  onGoalsChange: (value: number) => void
  onAssistsChange: (value: number) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">How did you do this session? Both fields are optional.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Goals</span>
          <input
            type="number"
            min={0}
            max={99}
            value={goals}
            disabled={loading}
            onChange={(e) => onGoalsChange(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 focus:border-indigo-500/40 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Assists</span>
          <input
            type="number"
            min={0}
            max={99}
            value={assists}
            disabled={loading}
            onChange={(e) => onAssistsChange(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 focus:border-indigo-500/40 focus:outline-none"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onSkip}
          className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300"
        >
          Skip
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          {loading ? 'Saving…' : 'Save stats'}
        </button>
      </div>
    </div>
  )
}

export function SessionDebriefSheet({
  open,
  onClose,
  orgSlug,
  eventId,
  payload,
  accent,
  onCompleted,
}: Props) {
  const [state, setState] = useState<SessionDebriefState | null>(null)
  const [currentStep, setCurrentStep] = useState<SessionDebriefStep>('mvp')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedNomineeId, setSelectedNomineeId] = useState<string | null>(null)
  const [goals, setGoals] = useState(0)
  const [assists, setAssists] = useState(0)

  useEffect(() => {
    if (!open) {
      setState(null)
      setCurrentStep('mvp')
      setLoading(false)
      setBusy(false)
      setError(null)
      setLoadError(null)
      setSelectedNomineeId(null)
      setGoals(0)
      setAssists(0)
      return
    }

    let cancelled = false

    async function loadState() {
      setLoadError(null)
      const result = await getSessionDebriefState(orgSlug, eventId)
      if (cancelled) return
      if ('error' in result) {
        setLoadError(result.error ?? 'Could not load debrief.')
        return
      }
      setState(result.state)
      setCurrentStep(resolveInitialDebriefStep(result.state))
      setSelectedNomineeId(result.state.mvp_nominee_participant_id)
    }

    void loadState()
    return () => {
      cancelled = true
    }
  }, [open, orgSlug, eventId])

  async function refreshState(): Promise<SessionDebriefState | null> {
    const result = await getSessionDebriefState(orgSlug, eventId)
    if ('error' in result) {
      setError(result.error ?? 'Could not refresh debrief.')
      return null
    }
    setState(result.state)
    return result.state
  }

  function goToNextStep(from: SessionDebriefStep, latestState: SessionDebriefState) {
    const next = nextDebriefStep(latestState.steps, from)
    if (next) {
      setCurrentStep(next)
      setError(null)
      return
    }
    onCompleted?.('done')
    onClose()
  }

  async function handleMvpSubmit() {
    if (!selectedNomineeId) return
    setLoading(true)
    setError(null)
    const result = await submitSessionMvpVote(orgSlug, eventId, selectedNomineeId)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    const latest = await refreshState()
    if (latest) goToNextStep('mvp', latest)
  }

  async function handleMvpSkip() {
    if (!state) return
    setLoading(true)
    setError(null)
    const result = await skipSessionDebriefStep(orgSlug, eventId, 'mvp')
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    const latest = await refreshState()
    if (latest) goToNextStep('mvp', latest)
  }

  async function handleStatsSubmit() {
    setLoading(true)
    setError(null)
    const result = await submitSessionPlayerStats(orgSlug, eventId, goals, assists)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    const latest = await refreshState()
    if (latest) goToNextStep('stats', latest)
  }

  async function handleStatsSkip() {
    setLoading(true)
    setError(null)
    const result = await skipSessionDebriefStep(orgSlug, eventId, 'stats')
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    const latest = await refreshState()
    if (latest) goToNextStep('stats', latest)
  }

  async function handleFeedbackSkip() {
    setLoading(true)
    setError(null)
    const result = await skipSessionDebriefStep(orgSlug, eventId, 'feedback')
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onCompleted?.('skipped')
    onClose()
  }

  const whenLine = formatDebriefWhen(payload.event_starts_at)
  const stepNumber = state ? debriefStepIndex(state.steps, currentStep) : 1
  const totalSteps = state ? debriefStepCount(state.steps) : 3
  const dismissDisabled = loading || busy

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      dismissDisabled={dismissDisabled}
      ariaLabelledby="session-debrief-title"
      panelStyle={{
        boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="session-debrief-title" className="text-lg font-semibold tracking-tight text-zinc-50">
          {debriefStepTitle(currentStep, {
            mvpVotingOpen: currentStep === 'mvp' ? state?.mvp_voting_open : undefined,
          })}
        </h2>
        {state ? (
          <span className="shrink-0 text-xs font-medium text-zinc-500">
            Step {stepNumber} of {totalSteps}
          </span>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-3">
        <p className="text-sm font-medium text-zinc-100">{payload.event_label}</p>
        <p className="mt-1 text-xs text-zinc-400">{whenLine}</p>
        {payload.location_label ? (
          <p className="mt-0.5 text-xs text-zinc-500">{payload.location_label}</p>
        ) : null}
      </div>

      {loadError ? (
        <p className="mt-6 text-sm text-red-400">{loadError}</p>
      ) : !state ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4">
          {currentStep === 'mvp' ? (
            <SessionMvpVoteStep
              state={state}
              accent={accent}
              loading={loading}
              error={error}
              selectedNomineeId={selectedNomineeId}
              onSelectNominee={setSelectedNomineeId}
              onSubmit={() => void handleMvpSubmit()}
              onSkip={() => void handleMvpSkip()}
            />
          ) : null}

          {currentStep === 'stats' ? (
            <SessionPlayerStatsStep
              accent={accent}
              loading={loading}
              error={error}
              goals={goals}
              assists={assists}
              onGoalsChange={setGoals}
              onAssistsChange={setAssists}
              onSubmit={() => void handleStatsSubmit()}
              onSkip={() => void handleStatsSkip()}
            />
          ) : null}

          {currentStep === 'feedback' ? (
            <div className="space-y-4">
              <SessionFeedbackStep
                orgSlug={orgSlug}
                eventId={eventId}
                accent={accent}
                disabled={loading}
                onBusyChange={setBusy}
                onComplete={(outcome) => {
                  onCompleted?.(outcome)
                  onClose()
                }}
              />
              <button
                type="button"
                disabled={loading || busy}
                onClick={() => void handleFeedbackSkip()}
                className="w-full text-center text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              >
                Skip feedback
              </button>
            </div>
          ) : null}

          {currentStep !== 'feedback' && previousDebriefStep(state.steps, currentStep) ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                const prev = previousDebriefStep(state.steps, currentStep)
                if (prev) setCurrentStep(prev)
              }}
              className="mt-4 w-full text-center text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Back
            </button>
          ) : null}
        </div>
      )}
    </BottomSheet>
  )
}
