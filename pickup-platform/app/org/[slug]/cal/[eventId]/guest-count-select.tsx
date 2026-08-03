import {
  clampGuestCount,
  guestCountOptionLabel,
  guestCountOptions,
} from '@/lib/guest-signups'

const selectClass =
  'mt-1 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-inset sm:text-sm'

/** Inline row: label left, select flexes to fill. */
const inlineSelectClass =
  'min-w-0 flex-1 appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-inset sm:text-sm'

type Props = {
  id?: string
  name?: string
  value?: number
  defaultValue?: number
  onChange?: (count: number) => void
  accent: string
  className?: string
  disabled?: boolean
}

export function GuestCountSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  accent,
  className = selectClass,
  disabled = false,
}: Props) {
  const controlled = value !== undefined

  return (
    <select
      id={id}
      name={name}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : (defaultValue ?? 0)}
      disabled={disabled}
      onChange={(event) => onChange?.(clampGuestCount(Number.parseInt(event.target.value, 10)))}
      className={className}
      style={{ '--tw-ring-color': accent } as React.CSSProperties}
    >
      {guestCountOptions().map((count) => (
        <option key={count} value={count}>
          {guestCountOptionLabel(count)}
        </option>
      ))}
    </select>
  )
}

type FieldProps = Omit<Props, 'className'> & {
  labelClassName?: string
  selectClassName?: string
}

/** Single-line “Guests you're bringing:” + guest count select. */
export function GuestCountField({
  labelClassName = 'shrink-0 text-xs text-zinc-500',
  selectClassName = inlineSelectClass,
  ...selectProps
}: FieldProps) {
  return (
    <label className="flex items-center gap-3">
      <span className={labelClassName}>Guests you&apos;re bringing:</span>
      <GuestCountSelect {...selectProps} className={selectClassName} />
    </label>
  )
}
