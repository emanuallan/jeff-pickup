'use client'

import { useFormStatus } from 'react-dom'
import { btnSecondary } from './console-ui'

/** Standard submit button for console forms — shows a pending label while saving. */
export function ConsoleSubmitButton({
  pending: pendingProp = false,
  pendingLabel = 'Saving…',
  className = btnSecondary,
  children,
  disabled,
  ...rest
}: Omit<React.ComponentProps<'button'>, 'type'> & {
  pending?: boolean
  pendingLabel?: string
}) {
  const { pending: formPending } = useFormStatus()
  const pending = pendingProp || formPending

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      aria-busy={pending}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
