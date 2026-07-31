'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateParticipantProfile } from '@/lib/participant-session-client'
import { formatPhoneDisplay } from '@/lib/phone'
import { accentOnDark } from '@/lib/colors'

type Props = {
  slug: string
  accent: string
  initial: {
    firstName: string
    lastName: string
    displayName: string
    email: string
    phone: string
  }
}

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

const readOnlyClass =
  'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-base text-zinc-400 sm:text-sm'

export function MeProfileForm({ slug, accent, initial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [email, setEmail] = useState(initial.email)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const accentSoft = accentOnDark(accent)
  const phoneDisplay = formatPhoneDisplay(initial.phone) || initial.phone

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const result = await updateParticipantProfile({
      slug,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: displayName.trim() || null,
      email: email.trim() || null,
    })

    if ('error' in result) {
      setError(result.error)
      return
    }

    setSaved(true)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-zinc-500">First name</span>
          <input
            name="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Last name</span>
          <input
            name="lastName"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-zinc-500">Display name</span>
        <input
          name="displayName"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Shown on the roster"
          className={inputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional"
          className={inputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Phone</span>
        <input
          type="text"
          name="phone"
          readOnly
          value={phoneDisplay}
          className={readOnlyClass}
          aria-describedby="me-phone-hint"
        />
        {/* TODO: same-participant_id phone correction (reject if number already taken in org; no merge). */}
        <p id="me-phone-hint" className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Your phone identifies you in this group. Changing it isn&apos;t available yet.
        </p>
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved && !error ? (
        <p className="text-sm" style={{ color: accentSoft }}>
          Profile saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 transition-opacity disabled:opacity-60 sm:w-auto"
        style={{ backgroundColor: accent }}
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
