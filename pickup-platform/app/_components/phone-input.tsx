'use client'

import { useState } from 'react'
import { formatPhoneDisplay, normalizePhoneDigits } from '@/lib/phone'

type Props = {
  className?: string
  style?: React.CSSProperties
  value?: string
  onChange?: (digits: string) => void
}

export function PhoneInput({ className, style, value, onChange }: Props) {
  const [internalDigits, setInternalDigits] = useState('')
  const digits = value ?? internalDigits
  const setDigits = onChange ?? setInternalDigits

  return (
    <>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required
        value={formatPhoneDisplay(digits)}
        onChange={(e) => setDigits(normalizePhoneDigits(e.target.value))}
        className={className}
        style={style}
        placeholder="(555) 123-4567"
        aria-label="Phone number"
      />
      <input type="hidden" name="phone" value={digits} />
    </>
  )
}
