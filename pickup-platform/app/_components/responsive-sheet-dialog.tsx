'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const overlayClass =
  'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'

const backdropClass = 'absolute inset-0 bg-black/60 backdrop-blur-sm'

const panelClass =
  'relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5'

type Props = {
  open: boolean
  onClose: () => void
  titleId: string
  children: ReactNode
  panelClassName?: string
}

export function ResponsiveSheetDialog({
  open,
  onClose,
  titleId,
  children,
  panelClassName,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={overlayClass} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className={backdropClass} aria-label="Close" onClick={onClose} />
      <div className={panelClassName ? `${panelClass} ${panelClassName}` : panelClass}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  )
}
