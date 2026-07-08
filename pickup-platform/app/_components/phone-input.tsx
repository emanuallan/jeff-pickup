'use client'

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_GROUPS,
  applyNationalInputChange,
  formatCountrySelectLabel,
  formatNationalInput,
  maxNationalDigits,
  normalizePhoneInput,
  parseNationalFieldInput,
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

/** Extra pixels for the native select dropdown affordance. */
const SELECT_ARROW_PADDING_PX = 22

const defaultNationalClass =
  'min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none sm:text-sm'

const defaultSelectClass =
  'min-w-[4.75rem] h-full shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-1.5 py-2.5 text-base leading-normal text-zinc-300 outline-none sm:text-sm'

/** Split a single input class string into wrapper + select + national field classes. */
export function splitPhoneFieldClasses(baseClass?: string) {
  if (!baseClass) {
    return {
      wrapper: 'flex w-full items-stretch gap-1.5',
      national: defaultNationalClass,
      select: defaultSelectClass,
    }
  }

  const selectFocusBorder = baseClass.includes('border-white/10')
    ? 'focus:border-white/10'
    : baseClass.includes('border-zinc-700')
      ? 'focus:border-zinc-700'
      : ''

  const wrapper = ['flex w-full items-stretch gap-1.5', baseClass.includes('mt-1') ? 'mt-1' : '']
    .filter(Boolean)
    .join(' ')

  let national = baseClass
    .replace(/\bmt-1\b/g, '')
    .replace(/\bw-full\b/g, '')
    .trim()
  if (!/\bflex-1\b/.test(national)) {
    national = `min-w-0 flex-1 ${national}`
  }

  let select = national.replace(/\bpx-3\b/g, 'px-2')
  if (!/\bshrink-0\b/.test(select)) {
    select = `min-w-[4.75rem] h-full shrink-0 ${select}`
  }
  if (!/\bleading-normal\b/.test(select)) {
    select = `leading-normal ${select}`
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
  const selectRef = useRef<HTMLSelectElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [selectWidthPx, setSelectWidthPx] = useState<number | null>(null)
  const isControlled = value !== undefined

  const parsedControlled = isControlled ? parseStoredPhone(value) : null
  const country = isControlled ? parsedControlled!.country : internalCountry
  const national = isControlled ? parsedControlled!.national : internalNational

  const e164 = normalizePhoneInput(country, national)
  const { wrapper, national: nationalClass, select: selectClass } = splitPhoneFieldClasses(className)
  const resolvedSelectClass = selectClassName ?? selectClass

  useLayoutEffect(() => {
    const select = selectRef.current
    const measure = measureRef.current
    if (!select || !measure) return

    measure.textContent = formatCountrySelectLabel(country)
    const computed = window.getComputedStyle(select)
    measure.style.font = computed.font
    measure.style.letterSpacing = computed.letterSpacing
    measure.style.paddingLeft = computed.paddingLeft
    measure.style.paddingRight = computed.paddingRight

    setSelectWidthPx(measure.offsetWidth + SELECT_ARROW_PADDING_PX)
  }, [country, resolvedSelectClass])

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
    const international = parseNationalFieldInput(country, nextValue)
    const digitCount = nextValue.replace(/\D/g, '').length
    const usedInternational =
      international.country !== country || digitCount > maxNationalDigits(country)
    const parsed = usedInternational
      ? international
      : {
          country,
          national: applyNationalInputChange(country, national, nextValue, selectionStart),
        }
    const nextE164 = normalizePhoneInput(parsed.country, parsed.national)
    if (!isControlled) {
      setInternalCountry(parsed.country)
      setInternalNational(parsed.national)
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
      <div
        className="relative shrink-0 self-stretch"
        style={selectWidthPx ? { width: selectWidthPx } : undefined}
      >
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 -z-10 whitespace-pre opacity-0"
        />
        <select
          ref={selectRef}
          value={country}
          onChange={(e) => updateCountry(e.target.value as PhoneCountry)}
          autoComplete="tel-country-code"
          aria-label="Country code"
          className={`${resolvedSelectClass} h-full w-full`}
          style={style}
        >
          <option value="US">
            {formatCountrySelectLabel('US')}
          </option>
          {PHONE_COUNTRY_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.countries.map((entry: PhoneCountryOption) => (
                <option key={entry.code} value={entry.code}>
                  {formatCountrySelectLabel(entry.code)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
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
