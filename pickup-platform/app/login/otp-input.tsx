'use client'

import { useEffect, useId, useRef } from 'react'
import { normalizeOtpInput, OTP_LENGTH } from '@/lib/login-otp'

type Props = {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCodePasted?: (code: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({ value, onChange, onCodePasted, disabled, autoFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pasteAttemptedRef = useRef(false)
  const labelId = useId()
  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('')

  useEffect(() => {
    if (value.length === 0) {
      pasteAttemptedRef.current = false
    }
  }, [value])

  async function tryPasteOnFirstInteract() {
    inputRef.current?.focus()

    if (disabled || pasteAttemptedRef.current) return
    pasteAttemptedRef.current = true

    try {
      const text = await navigator.clipboard.readText()
      const next = normalizeOtpInput(text)
      if (next) {
        onCodePasted?.(next)
      }
    } catch {
      // Clipboard unavailable or denied — fall through to manual entry.
    }
  }

  return (
    <div className="relative">
      <label id={labelId} className="sr-only">
        6-digit sign-in code
      </label>
      <div
        className="flex justify-center gap-2 sm:gap-2.5"
        onPointerDown={() => void tryPasteOnFirstInteract()}
        role="group"
        aria-labelledby={labelId}
      >
        {digits.map((digit, index) => {
          const filled = digit.trim().length > 0
          const active = !disabled && value.length === index
          const cursor = !disabled && value.length === OTP_LENGTH && index === OTP_LENGTH - 1

          return (
            <div
              key={index}
              aria-hidden
              className={[
                'flex h-12 w-10 items-center justify-center rounded-xl border text-lg font-semibold tabular-nums transition sm:h-14 sm:w-11 sm:text-xl',
                filled
                  ? 'border-indigo-400/40 bg-indigo-500/10 text-zinc-50'
                  : 'border-white/10 bg-zinc-900/50 text-zinc-500',
                active || cursor ? 'border-indigo-500/60 ring-2 ring-indigo-500/20' : '',
                disabled ? 'opacity-60' : '',
              ].join(' ')}
            >
              {filled ? digit : '·'}
            </div>
          )
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={onChange}
        onFocus={() => void tryPasteOnFirstInteract()}
        maxLength={OTP_LENGTH}
        className="absolute inset-0 cursor-text text-base opacity-0"
        aria-labelledby={labelId}
      />
    </div>
  )
}
