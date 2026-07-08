'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_GROUPS,
  applyNationalInputChange,
  formatNationalInput,
  maxNationalDigits,
  normalizePhoneInput,
  parseNationalInput,
  parseStoredPhone,
  type PhoneCountryOption,
  type PhoneCountry,
} from '@/lib/phone'

type Props = {
  className?: string
  selectClassName?: string
  style?: React.CSSProperties
  /** Full E.164 digits without '+'. */
  value?: string
  onChange?: (e164: string) => void
}

const defaultNationalClass =
  'min-w-0 flex-1 rounded-r-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none sm:text-sm'

const defaultSelectClass =
  'max-w-[4.75rem] shrink-0 rounded-l-xl border border-r-0 border-zinc-700 bg-zinc-900 px-1.5 py-2.5 text-sm text-zinc-300 outline-none sm:text-sm'

/** Split a single input class string into wrapper + select + national field classes. */
export function splitPhoneFieldClasses(baseClass?: string) {
  if (!baseClass) {
    return { wrapper: 'w-full', national: defaultNationalClass, select: defaultSelectClass }
  }

  const selectFocusBorder = baseClass.includes('border-white/10')
    ? 'focus:border-white/10'
    : baseClass.includes('border-zinc-700')
      ? 'focus:border-zinc-700'
      : ''

  const wrapper = ['flex w-full', baseClass.includes('mt-1') ? 'mt-1' : '']
    .filter(Boolean)
    .join(' ')

  let national = baseClass
    .replace(/\bmt-1\b/g, '')
    .replace(/\bw-full\b/g, '')
    .trim()
  national = national
    .replace(/\brounded-xl\b/g, 'rounded-r-xl')
    .replace(/\brounded-lg\b/g, 'rounded-r-lg')
  if (!/\bflex-1\b/.test(national)) {
    national = `min-w-0 flex-1 ${national}`
  }

  let select = national
    .replace(/\brounded-r-xl\b/g, 'rounded-l-xl')
    .replace(/\brounded-r-lg\b/g, 'rounded-l-lg')
    .replace(/\bpx-3\b/g, 'px-2')
  if (!/\bshrink-0\b/.test(select)) {
    select = `max-w-[4.75rem] shrink-0 ${select}`
  }
  if (!/\bborder-r-0\b/.test(select)) {
    select = select.replace(/\bborder\b/, 'border border-r-0')
  }

  // Prevent the select from drawing its own ring/border on focus; let the input's
  // focus styling carry the visual emphasis.
  select = `${select} focus:ring-0 focus:ring-offset-0 ${selectFocusBorder}`.trim()

  return { wrapper, national, select }
}

export function PhoneInput({ className, selectClassName, style, value, onChange }: Props) {
  const [internalCountry, setInternalCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY)
  const [internalNational, setInternalNational] = useState('')
  const editSelectionRef = useRef<number | null>(null)
  const isControlled = value !== undefined

  const parsedControlled = isControlled ? parseStoredPhone(value) : null
  const country = isControlled ? parsedControlled!.country : internalCountry
  const national = isControlled ? parsedControlled!.national : internalNational

  const e164 = normalizePhoneInput(country, national)
  const { wrapper, national: nationalClass, select: selectClass } = splitPhoneFieldClasses(className)

  function updateCountry(nextCountry: PhoneCountry) {
    const clampedNational = parseNationalInput(nextCountry, national)
    const nextE164 = normalizePhoneInput(nextCountry, clampedNational)
    if (isControlled) {
      onChange?.(nextE164)
      return
    }
    setInternalCountry(nextCountry)
    if (clampedNational !== national) {
      setInternalNational(clampedNational)
    }
    onChange?.(nextE164)
  }

  function updateNational(nextValue: string) {
    const selectionStart = editSelectionRef.current ?? undefined
    editSelectionRef.current = null
    const nextNational = applyNationalInputChange(country, national, nextValue, selectionStart)
    const nextE164 = normalizePhoneInput(country, nextNational)
    if (!isControlled) {
      setInternalNational(nextNational)
    }
    onChange?.(nextE164)
  }

  function rememberEditSelection(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      editSelectionRef.current = event.currentTarget.selectionStart
    }
  }

  return (
    <div className={wrapper}>
      <select
        value={country}
        onChange={(e) => updateCountry(e.target.value as PhoneCountry)}
        autoComplete="tel-country-code"
        aria-label="Country code"
        className={selectClassName ?? selectClass}
        style={style}
      >
        <option value="US">
          {PHONE_COUNTRIES[0]!.flag} +{PHONE_COUNTRIES[0]!.dialCode}
        </option>
        {PHONE_COUNTRY_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.countries.map((entry: PhoneCountryOption) => (
              <option key={entry.code} value={entry.code}>
                {entry.flag} +{entry.dialCode}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        maxLength={maxNationalDigits(country) + 8}
        value={formatNationalInput(country, national)}
        onKeyDown={rememberEditSelection}
        onChange={(e) => updateNational(e.target.value)}
        className={nationalClass}
        style={style}
        placeholder={country === 'US' ? '(555) 123-4567' : ''}
        aria-label="Phone number"
      />
      <input type="hidden" name="phone" value={e164} />
    </div>
  )
}
