'use client'

import { useState } from 'react'
import { formatPhoneDisplay, normalizePhoneDigits } from '@/lib/phone'

type Props = {
  className?: string
  style?: React.CSSProperties
}

export function PhoneInput({ className, style }: Props) {
  const [digits, setDigits] = useState('')

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
