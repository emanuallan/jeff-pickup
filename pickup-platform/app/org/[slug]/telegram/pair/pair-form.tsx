'use client'

import { useState, useTransition } from 'react'
import { PhoneInput } from '@/app/_components/phone-input'
import {
  confirmTelegramPairWithPhone,
  confirmTelegramPairWithSession,
} from './actions'

type Props = {
  orgSlug: string
  token: string
  orgName: string
  sessionDisplayName: string | null
  telegramUsername: string | null
}

export function TelegramPairForm({
  orgSlug,
  token,
  orgName,
  sessionDisplayName,
  telegramUsername,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [doneName, setDoneName] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (doneName) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-6 text-center">
        <p className="text-lg font-medium text-emerald-200">You&apos;re linked</p>
        <p className="mt-2 text-sm text-zinc-300">
          {doneName} is connected to Telegram
          {telegramUsername ? ` (@${telegramUsername})` : ''}.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Go back to your group chat and use /in, /out, or /maybe.
        </p>
      </div>
    )
  }

  function handleConfirmSession() {
    startTransition(async () => {
      setError(null)
      const result = await confirmTelegramPairWithSession(orgSlug, token)
      if (result.error) {
        setError(result.error)
        return
      }
      setDoneName(result.displayName ?? sessionDisplayName ?? 'You')
    })
  }

  function handlePhoneSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      const result = await confirmTelegramPairWithPhone(orgSlug, token, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      setDoneName(result.displayName ?? 'You')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Link Telegram
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connect your Telegram account to your {orgName} profile so you can RSVP with
          /in /out /maybe.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {sessionDisplayName ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="text-sm text-zinc-300">
            Continue as <span className="font-medium text-zinc-100">{sessionDisplayName}</span>?
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirmSession}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? 'Linking…' : 'Yes, link this account'}
          </button>
          <p className="text-xs text-zinc-500">Not you? Enter your phone below.</p>
        </div>
      ) : null}

      <form action={handlePhoneSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <p className="text-sm font-medium text-zinc-200">
          {sessionDisplayName ? 'Use a different phone' : 'Enter your details'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            First name
            <input
              name="firstName"
              required
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Last name
            <input
              name="lastName"
              required
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </label>
        </div>
        <label className="block text-xs text-zinc-500">
          Phone
          <div className="mt-1">
            <PhoneInput className="mt-0 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none" />
          </div>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? 'Linking…' : 'Link Telegram'}
        </button>
      </form>
    </div>
  )
}
