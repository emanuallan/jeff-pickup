'use client'

import { useEffect, useState } from 'react'
import { accentOnDark } from '@/lib/colors'
import {
  normalizeTeamChoice,
  sessionTeamLabel,
  sessionTeamOptions,
  type SessionTeamChoice,
  type SessionTeamOrUnassigned,
} from '@/lib/session-team'
import { updateSignupTeam } from './actions'

export function TeamPicker(props: {
  orgSlug: string
  eventId: string
  signupId: string
  teamCount: number
  currentTeam: SessionTeamOrUnassigned
  accent: string
  hideHeading?: boolean
  onSuccess?: () => void
}) {
  const [team, setTeam] = useState<SessionTeamOrUnassigned>(props.currentTeam ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const choices: { value: SessionTeamChoice; label: string }[] = [
    ...sessionTeamOptions(props.teamCount).map((n) => ({
      value: n as SessionTeamChoice,
      label: sessionTeamLabel(n),
    })),
    { value: 'random', label: 'Random' },
  ]

  useEffect(() => {
    setTeam(props.currentTeam ?? null)
  }, [props.currentTeam])

  return (
    <div>
      {!props.hideHeading ? (
        <div>
          <p className="text-xs font-medium text-zinc-400">Pick your team</p>
          {team ? (
            <p className="mt-1 text-sm text-zinc-300">{sessionTeamLabel(team)}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Not assigned yet</p>
          )}
        </div>
      ) : null}
      <div className={`flex flex-wrap gap-2${props.hideHeading ? '' : ' mt-2'}`}>
        {choices.map((choice) => {
          const selected = choice.value !== 'random' && team === choice.value
          return (
            <button
              key={String(choice.value)}
              type="button"
              disabled={loading}
              onClick={async () => {
                if (choice.value !== 'random' && choice.value === team) return
                const prev = team
                if (choice.value !== 'random') {
                  setTeam(choice.value)
                }
                setLoading(true)
                setError(null)
                const result = await updateSignupTeam(
                  props.orgSlug,
                  props.eventId,
                  props.signupId,
                  normalizeTeamChoice(choice.value),
                )
                setLoading(false)
                if (result.error) {
                  setTeam(prev)
                  setError(result.error)
                  return
                }
                props.onSuccess?.()
              }}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={
                selected
                  ? {
                      borderColor: accentOnDark(props.accent),
                      backgroundColor: `${props.accent}1a`,
                      color: accentOnDark(props.accent),
                    }
                  : { borderColor: '#3f3f46', color: '#d4d4d8' }
              }
            >
              {choice.label}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
