'use client'

import {
  SESSION_TEAM_COLORS,
  sessionTeamColorHex,
  sessionTeamColorLabel,
  type SessionTeamColorSlug,
} from '@/lib/session-team-color'

type Size = 'sm' | 'md'

function swatchNeedsDarkRing(slug: SessionTeamColorSlug): boolean {
  return slug === 'white' || slug === 'yellow'
}

export function TeamColorSwatchPicker({
  value,
  taken,
  onChange,
  disabled = false,
  size = 'md',
  name,
}: {
  value: SessionTeamColorSlug | null
  taken: ReadonlySet<SessionTeamColorSlug>
  onChange?: (slug: SessionTeamColorSlug) => void
  disabled?: boolean
  size?: Size
  /** When set, the selected color is posted with the surrounding form. */
  name?: string
}) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup">
      {name && value ? <input type="hidden" name={name} value={value} /> : null}
      {SESSION_TEAM_COLORS.map((color) => {
        const selected = value === color.slug
        const isTaken = taken.has(color.slug)
        const blocked = disabled || (isTaken && !selected)
        return (
          <button
            key={color.slug}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
              isTaken && !selected
                ? `${color.label} (taken)`
                : color.label
            }
            disabled={blocked}
            onClick={() => {
              if (blocked || !onChange || selected) return
              onChange(color.slug)
            }}
            className={[
              dim,
              'rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed',
              selected
                ? 'scale-110 shadow-sm'
                : isTaken
                  ? 'opacity-25'
                  : 'opacity-90 hover:scale-105',
            ].join(' ')}
            style={{
              backgroundColor: sessionTeamColorHex(color.slug),
              borderColor: selected
                ? '#fafafa'
                : swatchNeedsDarkRing(color.slug)
                  ? 'rgba(24,24,27,0.55)'
                  : 'rgba(255,255,255,0.18)',
            }}
            title={
              isTaken && !selected
                ? `${sessionTeamColorLabel(color.slug)} is already taken`
                : sessionTeamColorLabel(color.slug)
            }
          />
        )
      })}
    </div>
  )
}
