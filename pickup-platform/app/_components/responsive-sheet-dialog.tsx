'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const overlayClass =
  'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'

const backdropClass = 'absolute inset-0 bg-black/60 backdrop-blur-sm'

const immersiveBackdropClass = 'absolute inset-0 bg-black/75 backdrop-blur-md'

const panelClass =
  'relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5'

const immersivePanelClass =
  'relative flex max-h-[96dvh] min-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-zinc-800/80 bg-linear-to-b from-zinc-900 via-zinc-950 to-zinc-950 shadow-2xl sm:min-h-0 sm:max-h-[90dvh] sm:max-w-lg sm:rounded-2xl'

type Props = {
  open: boolean
  onClose: () => void
  titleId: string
  children: ReactNode
  panelClassName?: string
  /** Full-height sheet on mobile; centered dialog on desktop. */
  immersive?: boolean
  dismissOnBackdrop?: boolean
  dismissOnEscape?: boolean
}

export function ResponsiveSheetDialog({
  open,
  onClose,
  titleId,
  children,
  panelClassName,
  immersive = false,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
}: Props) {
  useEffect(() => {
    if (!open || !dismissOnEscape) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, dismissOnEscape])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const panelBase = immersive ? immersivePanelClass : panelClass

  return createPortal(
    <div className={overlayClass} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {dismissOnBackdrop ? (
        <button
          type="button"
          className={immersive ? immersiveBackdropClass : backdropClass}
          aria-label="Close"
          onClick={onClose}
        />
      ) : (
        <div
          className={immersive ? immersiveBackdropClass : backdropClass}
          aria-hidden
        />
      )}
      <div className={panelClassName ? `${panelBase} ${panelClassName}` : panelBase}>
        {!immersive ? (
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" aria-hidden />
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}
