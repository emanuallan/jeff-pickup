'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateParticipantProfile } from '@/lib/participant-session-client'
import { PhoneInput } from '@/app/_components/phone-input'
import { accentOnDark } from '@/lib/colors'
import { isValidPhoneDigits } from '@/lib/phone'

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
  emailVerified?: boolean
}

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

export function MeProfileForm({ slug, accent, initial, emailVerified = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [email, setEmail] = useState(initial.email)
  const [phone, setPhone] = useState(initial.phone || '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const accentSoft = accentOnDark(accent)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    if (phone.length > 0 && !isValidPhoneDigits(phone)) {
      setError('Enter a valid phone number, or leave it blank.')
      return
    }

    const result = await updateParticipantProfile({
      slug,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: displayName.trim() || null,
      email: emailVerified ? undefined : email.trim() || null,
      phone: phone.length > 0 ? phone : '',
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
          readOnly={emailVerified}
          placeholder={emailVerified ? undefined : 'Optional until verified'}
          className={inputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          {emailVerified
            ? 'Verified — used to sign back in on any device.'
            : 'Verify an email from a session page to recover this account later.'}
        </p>
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Phone</span>
        <PhoneInput
          value={phone}
          onChange={setPhone}
          required={false}
          className={inputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Optional contact for organizers. You can update or clear it anytime.
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
