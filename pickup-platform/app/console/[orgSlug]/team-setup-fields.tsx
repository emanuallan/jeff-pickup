'use client'

import { useState } from 'react'
import { consoleInput, consoleLabel } from '@/app/console/_components/console-ui'
import { TeamColorSwatchPicker } from '@/app/_components/team-color-swatch-picker'
import {
  MAX_SESSION_TEAM_COUNT,
  MIN_SESSION_TEAM_COUNT,
  parseSessionTeamCount,
} from '@/lib/session-team'
import {
  defaultTeamColors,
  resizeTeamColors,
  sessionTeamShirtHint,
  takenTeamColors,
  type SessionTeamColorSlug,
} from '@/lib/session-team-color'

type Props = {
  teamCount: string
  teamColors: SessionTeamColorSlug[]
  onTeamCountChange: (count: string, colors: SessionTeamColorSlug[]) => void
  onTeamColorsChange: (colors: SessionTeamColorSlug[]) => void
  hintId?: string
  hint?: string
  includeHiddenInputs?: boolean
}

export function TeamSetupFields({
  teamCount,
  teamColors,
  onTeamCountChange,
  onTeamColorsChange,
  hintId = 'team-count-hint',
  hint = 'When set, players pick a team after joining. Each team gets a unique shirt color so sides are easy to spot.',
  includeHiddenInputs = true,
}: Props) {
  const parsedCount = parseSessionTeamCount(teamCount)

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={consoleLabel}>Teams (optional)</span>
        <select
          name="team_count"
          value={teamCount}
          onChange={(event) => {
            const next = event.target.value
            const n = parseSessionTeamCount(next)
            onTeamCountChange(next, n != null ? resizeTeamColors(teamColors, n) : [])
          }}
          className={`mt-1 ${consoleInput}`}
          aria-describedby={hintId}
        >
          <option value="">No teams</option>
          {Array.from(
            { length: MAX_SESSION_TEAM_COUNT - MIN_SESSION_TEAM_COUNT + 1 },
            (_, i) => MIN_SESSION_TEAM_COUNT + i,
          ).map((n) => (
            <option key={n} value={n}>
              {n} teams
            </option>
          ))}
        </select>
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          {hint}
        </p>
      </label>

      {parsedCount != null ? (
        <fieldset className="space-y-3">
          <legend className={consoleLabel}>Shirt colors</legend>
          <p className="text-xs leading-relaxed text-zinc-500">
            One color per team — no repeats. Players bring that color.
          </p>
          {Array.from({ length: parsedCount }, (_, index) => {
            const slug = teamColors[index] ?? defaultTeamColors(parsedCount)[index]!
            return (
              <div key={index} className="space-y-1.5">
                {includeHiddenInputs ? (
                  <input type="hidden" name="team_color" value={slug} />
                ) : null}
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-200">Team {index + 1}</p>
                  <p className="text-xs text-zinc-500">{sessionTeamShirtHint(slug)}</p>
                </div>
                <TeamColorSwatchPicker
                  value={slug}
                  taken={takenTeamColors(teamColors, index)}
                  onChange={(next) => {
                    const colors = [...teamColors]
                    colors[index] = next
                    onTeamColorsChange(resizeTeamColors(colors, parsedCount))
                  }}
                />
              </div>
            )
          })}
        </fieldset>
      ) : null}
    </div>
  )
}

/** Uncontrolled wrapper for native form posts (schedules). */
export function TeamSetupFieldsUncontrolled({
  defaultTeamCount,
  defaultTeamColors: initialColors,
  hintId,
  hint,
}: {
  defaultTeamCount?: number | null
  defaultTeamColors?: SessionTeamColorSlug[] | null
  hintId?: string
  hint?: string
}) {
  const [teamCount, setTeamCount] = useState(
    defaultTeamCount != null ? String(defaultTeamCount) : '',
  )
  const [teamColors, setTeamColors] = useState<SessionTeamColorSlug[]>(() =>
    defaultTeamCount != null
      ? resizeTeamColors(initialColors ?? [], defaultTeamCount)
      : [],
  )

  return (
    <TeamSetupFields
      teamCount={teamCount}
      teamColors={teamColors}
      onTeamCountChange={(count, colors) => {
        setTeamCount(count)
        setTeamColors(colors)
      }}
      onTeamColorsChange={setTeamColors}
      hintId={hintId}
      hint={hint}
    />
  )
}
