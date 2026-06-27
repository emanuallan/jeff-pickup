'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

const DISMISS_THRESHOLD = 72
const SHEET_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Console: bottom sheet on mobile, centered dialog on sm+. Fixed: always bottom-anchored. */
  variant?: 'console' | 'fixed'
  panelClassName?: string
  panelStyle?: CSSProperties
  ariaLabelledby?: string
  ariaLabel?: string
  /** When true, blocks dismiss via swipe, backdrop, and Escape. */
  dismissDisabled?: boolean
}

function BottomSheetHandle({
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  onDragStart: (clientY: number) => void
  onDragMove: (clientY: number) => void
  onDragEnd: () => void
}) {
  return (
    <div
      className="flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        onDragStart(e.clientY)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => onDragMove(e.clientY)}
      onPointerUp={() => onDragEnd()}
      onPointerCancel={() => onDragEnd()}
    >
      <div className="h-1 w-10 rounded-full bg-zinc-700" aria-hidden />
    </div>
  )
}

export function BottomSheet({
  open,
  onClose,
  children,
  variant = 'console',
  panelClassName = '',
  panelStyle,
  ariaLabelledby,
  ariaLabel,
  dismissDisabled = false,
}: Props) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeEnabled, setSwipeEnabled] = useState(variant === 'fixed')
  const dragStartY = useRef<number | null>(null)
  const dragYRef = useRef(0)

  useEffect(() => {
    if (variant !== 'console') return
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setSwipeEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [variant])

  const resetDrag = useCallback(() => {
    setDragY(0)
    setIsDragging(false)
    dragStartY.current = null
    dragYRef.current = 0
  }, [])

  const requestClose = useCallback(() => {
    if (dismissDisabled) return
    resetDrag()
    onClose()
  }, [dismissDisabled, onClose, resetDrag])

  const onDragStart = useCallback(
    (clientY: number) => {
      if (!swipeEnabled || dismissDisabled) return
      dragStartY.current = clientY
      setIsDragging(true)
    },
    [dismissDisabled, swipeEnabled],
  )

  const onDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return
    const delta = Math.max(0, clientY - dragStartY.current)
    dragYRef.current = delta
    setDragY(delta)
  }, [])

  const onDragEnd = useCallback(() => {
    if (dragStartY.current === null) return
    const shouldDismiss = dragYRef.current > DISMISS_THRESHOLD
    dragStartY.current = null
    setIsDragging(false)
    if (shouldDismiss) {
      if (dismissDisabled) {
        dragYRef.current = 0
        setDragY(0)
        return
      }
      resetDrag()
      onClose()
    } else {
      dragYRef.current = 0
      setDragY(0)
    }
  }, [dismissDisabled, onClose, resetDrag])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, requestClose])

  useEffect(() => {
    if (!open) resetDrag()
  }, [open, resetDrag])

  if (!open) return null

  const overlayClass =
    variant === 'console'
      ? 'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'
      : 'fixed inset-0 z-50'

  const backdropClass =
    variant === 'console'
      ? 'absolute inset-0 bg-black/60 backdrop-blur-sm animate-[backdrop-in_200ms_ease-out]'
      : 'absolute inset-0 bg-black/60 backdrop-blur-sm animate-[backdrop-in_200ms_ease-out]'

  const panelBase =
    variant === 'console'
      ? 'relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 shadow-xl sm:rounded-xl'
      : 'absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl border border-b-0 border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 shadow-2xl'

  const dragStyle: CSSProperties = {
    ...panelStyle,
    transform: dragY > 0 ? `translateY(${dragY}px)` : panelStyle?.transform,
    transition: isDragging
      ? 'none'
      : dragY === 0
        ? `transform 280ms ${SHEET_EASING}`
        : undefined,
    animation:
      dragY === 0 && !isDragging && variant === 'fixed'
        ? `bottom-sheet-in 280ms ${SHEET_EASING}`
        : undefined,
  }

  return (
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={backdropClass}
        aria-label="Close"
        onClick={requestClose}
      />
      <div className={`${panelBase} ${panelClassName}`} style={dragStyle}>
        {swipeEnabled ? (
          <BottomSheetHandle
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ) : null}
        <div
          className={`px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 ${
            swipeEnabled ? 'pt-0' : 'pt-5'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
