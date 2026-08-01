'use client'

import { useState, type ReactNode } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { btnPrimary, btnSecondary } from './console-ui'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive styling for the confirm button. */
  danger?: boolean
  pending?: boolean
  onConfirm: () => void | Promise<void>
}

/** BottomSheet confirm dialog — preferred over window.confirm in the console. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  pending = false,
  onConfirm,
}: Props) {
  const titleId = 'confirm-sheet-title'
  const [busy, setBusy] = useState(false)
  const isPending = pending || busy

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissDisabled={isPending}
      ariaLabelledby={titleId}
      panelClassName={danger ? 'max-w-md border-red-500/30' : 'max-w-md'}
    >
      <h3 id={titleId} className="text-lg font-semibold text-zinc-50">
        {title}
      </h3>
      <div className="mt-2 text-sm text-zinc-400">{description}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className={btnSecondary}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isPending}
          className={
            danger
              ? 'inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50'
              : btnPrimary
          }
        >
          {isPending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
