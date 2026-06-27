'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { quickJoinEvent } from './actions'
import { fireConfetti } from '@/lib/confetti'
import { accentOnDark, hexToRgba } from '@/lib/colors'

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-zinc-500${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  eventTitle: string
  eventWhen: string
  locationLabel: string
  locationMapsUrl: string | null
  children: ReactNode
}

function CheckIcon() {
  return (
    <svg aria-hidden className="size-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MaybeIcon() {
  return (
    <svg aria-hidden className="size-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.414.336-.75.75-.75a1.5 1.5 0 0 0-1.043-2.66ZM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function returningSignupStorageKey(orgSlug: string, eventId: string) {
  return `returning-signup-seen:${orgSlug}:${eventId}`
}

function hasSeenReturningSignup(orgSlug: string, eventId: string) {
  try {
    return localStorage.getItem(returningSignupStorageKey(orgSlug, eventId)) === '1'
  } catch {
    return false
  }
}

function markReturningSignupSeen(orgSlug: string, eventId: string) {
  try {
    localStorage.setItem(returningSignupStorageKey(orgSlug, eventId), '1')
  } catch {
    // ignore quota / private mode
  }
}

export function ReturningSignupModal({
  orgSlug,
  orgId,
  eventId,
  accent,
  accentText,
  eventTitle,
  eventWhen,
  locationLabel,
  locationMapsUrl,
  children,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<'confirmed' | 'maybe' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const dragYRef = useRef(0)

  const markSeen = useCallback(() => {
    markReturningSignupSeen(orgSlug, eventId)
  }, [orgSlug, eventId])

  useEffect(() => {
    setOpen(!hasSeenReturningSignup(orgSlug, eventId))
  }, [orgSlug, eventId])

  const dismiss = useCallback(() => {
    markSeen()
    setOpen(false)
    setError(null)
    setDragY(0)
    setIsDragging(false)
    dragStartY.current = null
    dragYRef.current = 0
  }, [markSeen])

  const onDragStart = useCallback((clientY: number) => {
    if (loading !== null) return
    dragStartY.current = clientY
    setIsDragging(true)
  }, [loading])

  const onDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return
    const delta = Math.max(0, clientY - dragStartY.current)
    dragYRef.current = delta
    setDragY(delta)
  }, [])

  const onDragEnd = useCallback(() => {
    if (dragStartY.current === null) return
    const shouldDismiss = dragYRef.current > 72
    dragStartY.current = null
    setIsDragging(false)
    if (shouldDismiss) {
      dismiss()
    } else {
      dragYRef.current = 0
      setDragY(0)
    }
  }, [dismiss])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function handleJoin(status: 'confirmed' | 'maybe') {
    markSeen()
    setLoading(status)
    setError(null)
    const result = await quickJoinEvent(orgSlug, eventId, orgId, 0, status)
    setLoading(null)
    if (result.error) {
      setError(result.error)
      return
    }
    dismiss()
    void fireConfetti(accent)
    router.refresh()
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[backdrop-in_200ms_ease-out]"
            onClick={dismiss}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="returning-signup-title"
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl border border-b-0 border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 px-5 pt-1 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            style={{
              boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: isDragging
                ? 'none'
                : dragY === 0
                  ? 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)'
                  : undefined,
              animation: dragY === 0 && !isDragging
                ? 'bottom-sheet-in 280ms cubic-bezier(0.32, 0.72, 0, 1)'
                : undefined,
            }}
          >
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

            <div className="pt-2">
              <h2
                id="returning-signup-title"
                className="text-lg font-semibold tracking-tight text-zinc-50"
              >
                {eventTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{eventWhen}</p>
              <div className="mt-2 flex items-start gap-2 text-sm text-zinc-400">
                <PinIcon className="mt-0.5" />
                {locationMapsUrl ? (
                  <a
                    href={locationMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={markSeen}
                    className="min-w-0 truncate transition-colors hover:opacity-80"
                    style={{ color: accentOnDark(accent) }}
                  >
                    {locationLabel}
                  </a>
                ) : (
                  <span className="min-w-0 truncate">{locationLabel}</span>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-800 pt-5">
              <p
                className="text-2xl font-semibold tracking-tight"
                style={{ color: accentOnDark(accent) }}
              >
                You in?
              </p>
              <p className="mt-1 text-sm text-zinc-500">One tap lets the group know.</p>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('maybe')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50"
              >
                <MaybeIcon />
                {loading === 'maybe' ? 'Saving…' : 'Maybe'}
              </button>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('confirmed')}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: accent,
                  color: accentText,
                  boxShadow: `0 10px 30px -12px ${accent}`,
                }}
              >
                <CheckIcon />
                {loading === 'confirmed' ? 'Counting you in…' : "I'm in"}
              </button>
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          </div>
        </div>
      ) : null}

      {open === false ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          {children}
        </section>
      ) : null}
    </>
  )
}
