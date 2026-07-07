'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { lockBodyScroll } from '@/lib/body-scroll-lock'

const DISMISS_THRESHOLD = 72
const SHEET_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SHEET_ENTER_MS = 280
const SHEET_EXIT_MS = 420
const BACKDROP_EXIT_MS = 380
const NOTIFICATION_EXIT_MS = 360
const DIALOG_EXIT_MS = 320

function initialSwipeEnabled(variant: 'console' | 'fixed' | 'top') {
  if (variant === 'fixed' || variant === 'top') return true
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 639px)').matches
}

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Console: bottom sheet on mobile, centered dialog on sm+. Fixed: bottom-anchored. Top: top-anchored. */
  variant?: 'console' | 'fixed' | 'top'
  panelClassName?: string
  panelStyle?: CSSProperties
  ariaLabelledby?: string
  ariaLabel?: string
  /** When true, blocks dismiss via swipe, backdrop, and Escape. */
  dismissDisabled?: boolean
}

function SheetHandle({
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
      className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
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
  const dragUp = variant === 'top'
  const [present, setPresent] = useState(open)
  const [exiting, setExiting] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeEnabled, setSwipeEnabled] = useState(() => initialSwipeEnabled(variant))
  const dragStartY = useRef<number | null>(null)
  const dragOffsetRef = useRef(0)

  useEffect(() => {
    if (variant !== 'console') return
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setSwipeEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [variant])

  const resetDrag = useCallback(() => {
    setDragOffset(0)
    setIsDragging(false)
    dragStartY.current = null
    dragOffsetRef.current = 0
  }, [])

  const requestClose = useCallback(() => {
    if (dismissDisabled || exiting) return
    resetDrag()
    onClose()
  }, [dismissDisabled, exiting, onClose, resetDrag])

  const onDragStart = useCallback(
    (clientY: number) => {
      if (!swipeEnabled || dismissDisabled) return
      dragStartY.current = clientY
      setIsDragging(true)
    },
    [dismissDisabled, swipeEnabled],
  )

  const onDragMove = useCallback(
    (clientY: number) => {
      if (dragStartY.current === null) return
      const rawDelta = dragUp
        ? dragStartY.current - clientY
        : clientY - dragStartY.current
      const delta = Math.max(0, rawDelta)
      dragOffsetRef.current = delta
      setDragOffset(delta)
    },
    [dragUp],
  )

  const onDragEnd = useCallback(() => {
    if (dragStartY.current === null) return
    const shouldDismiss = dragOffsetRef.current > DISMISS_THRESHOLD
    dragStartY.current = null
    setIsDragging(false)
    if (shouldDismiss) {
      if (dismissDisabled) {
        dragOffsetRef.current = 0
        setDragOffset(0)
        return
      }
      resetDrag()
      onClose()
    } else {
      dragOffsetRef.current = 0
      setDragOffset(0)
    }
  }, [dismissDisabled, onClose, resetDrag])

  useEffect(() => {
    if (open) {
      setPresent(true)
      setExiting(false)
      return
    }
    if (present) {
      setExiting(true)
    }
  }, [open, present])

  useEffect(() => {
    if (!exiting) return
    const timer = window.setTimeout(() => {
      setPresent(false)
      setExiting(false)
      resetDrag()
    }, SHEET_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [exiting, resetDrag])

  useEffect(() => {
    if (!present) return

    const unlockScroll = lockBodyScroll()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      unlockScroll()
    }
  }, [present, requestClose])

  if (!present) return null

  const overlayClass =
    variant === 'console'
      ? 'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'
      : 'fixed inset-0 z-50'

  const panelBase =
    variant === 'console'
      ? 'relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 shadow-xl sm:rounded-xl'
      : variant === 'top'
        ? 'absolute inset-x-0 top-0 mx-auto flex max-h-[min(85dvh,28rem)] w-full flex-col overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]'
        : 'absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl border border-b-0 border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 shadow-2xl'

  const translateY =
    dragOffset > 0 ? (dragUp ? -dragOffset : dragOffset) : 0

  const exitAnimation = exiting
    ? variant === 'top'
      ? `notification-sheet-out ${NOTIFICATION_EXIT_MS}ms ease-in forwards`
      : variant === 'fixed' || (variant === 'console' && swipeEnabled)
        ? `bottom-sheet-out ${SHEET_EXIT_MS}ms ${SHEET_EASING} forwards`
        : variant === 'console'
          ? `dialog-out ${DIALOG_EXIT_MS}ms ${SHEET_EASING} forwards`
          : undefined
    : undefined

  const enterAnimation =
    !exiting && dragOffset === 0 && !isDragging
      ? variant === 'top'
        ? `notification-sheet-in 220ms ease-out`
        : variant === 'fixed' || (variant === 'console' && swipeEnabled)
          ? `bottom-sheet-in ${SHEET_ENTER_MS}ms ${SHEET_EASING}`
          : variant === 'console'
            ? `dialog-in 200ms ${SHEET_EASING}`
            : undefined
      : undefined

  const dragStyle: CSSProperties = {
    ...panelStyle,
    transform:
      !exiting && translateY !== 0
        ? `translateY(${translateY}px)`
        : exiting
          ? undefined
          : panelStyle?.transform,
    transition: isDragging
      ? 'none'
      : dragOffset === 0 && !exiting
        ? `transform ${SHEET_ENTER_MS}ms ${SHEET_EASING}`
        : undefined,
    animation: exitAnimation ?? enterAnimation,
  }

  const handleProps = {
    onDragStart,
    onDragMove,
    onDragEnd,
  }

  const contentClass =
    variant === 'top'
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
      : `px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 ${
          swipeEnabled ? 'pt-0' : 'pt-5'
        }`

  return (
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
      style={{ pointerEvents: exiting ? 'none' : undefined }}
    >
      <button
        type="button"
        className={
          exiting
            ? 'absolute inset-0 bg-black/60 backdrop-blur-sm'
            : 'absolute inset-0 bg-black/60 backdrop-blur-sm animate-[backdrop-in_200ms_ease-out]'
        }
        style={
          exiting
            ? { animation: `backdrop-out ${BACKDROP_EXIT_MS}ms ease-in forwards` }
            : undefined
        }
        aria-label="Close"
        onClick={requestClose}
      />
      <div className={`${panelBase} ${panelClassName}`} style={dragStyle}>
        {swipeEnabled && !dragUp ? <SheetHandle {...handleProps} /> : null}
        <div className={contentClass}>{children}</div>
        {swipeEnabled && dragUp ? <SheetHandle {...handleProps} /> : null}
      </div>
    </div>
  )
}

/** True when viewport uses mobile sheet layout (< sm). */
export function useMobileSheetLayout() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}
