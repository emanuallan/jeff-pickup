'use client'

import { useId } from 'react'
import { OTP_LENGTH } from '@/lib/login-otp'
import { organizrInput } from '../_components/organizr-shell'

type Props = {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onPaste?: () => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({ value, onChange, onPaste, disabled, autoFocus }: Props) {
  const inputId = useId()

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="sr-only">
        6-digit sign-in code
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={onChange}
        maxLength={OTP_LENGTH}
        placeholder="000000"
        className={`${organizrInput} py-3.5 text-center text-base font-semibold tracking-[0.35em] tabular-nums placeholder:tracking-[0.35em] placeholder:text-zinc-700 sm:text-xl`}
      />
      {onPaste ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onPaste}
            disabled={disabled}
            className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            Paste code
          </button>
        </div>
      ) : null}
    </div>
  )
}
