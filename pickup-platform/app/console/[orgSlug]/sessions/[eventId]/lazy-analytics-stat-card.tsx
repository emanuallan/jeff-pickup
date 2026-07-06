'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { BottomSheetLoading } from '../../../_components/bottom-sheet-loading'
import { ConsoleCard } from '../../../_components/console-ui'
import { useConsoleToast } from '../../../_components/console-toast'

type Props<T> = {
  orgSlug: string
  eventId: string
  metric: string
  disabled?: boolean
  value: string
  label: string
  hint?: string
  valueClassName?: string
  interactiveHint?: string
  sheetTitle: string
  sheetDescription: string
  sheetTitleId: string
  emptyMessage?: string
  loadingLabel?: string
  skeletonRows?: number
  children: (data: T) => ReactNode
  hasContent?: (data: T) => boolean
}

export function LazyAnalyticsStatCard<T>({
  orgSlug,
  eventId,
  metric,
  disabled = false,
  value,
  label,
  hint,
  valueClassName = 'text-2xl font-semibold',
  interactiveHint,
  sheetTitle,
  sheetDescription,
  sheetTitleId,
  emptyMessage = 'Nothing to show yet.',
  loadingLabel = 'Loading…',
  skeletonRows = 3,
  children,
  hasContent,
}: Props<T>) {
  const toast = useConsoleToast()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setLoadFailed(false)

      try {
        const res = await fetch(
          `/api/console/${orgSlug}/events/${eventId}/analytics-detail?metric=${metric}`,
          { signal },
        )

        if (!res.ok) {
          throw new Error('Could not load details')
        }

        setData((await res.json()) as T)
      } catch (err) {
        if (signal.aborted) return
        const message = err instanceof Error ? err.message : 'Something went wrong'
        toast.error(message)
        setLoadFailed(true)
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [orgSlug, eventId, metric, toast],
  )

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [open, load])

  const card = (
    <ConsoleCard className="flex flex-col gap-1">
      <div className={`tabular-nums text-zinc-50 ${valueClassName}`}>{value}</div>
      <div className="text-xs font-medium text-zinc-400">{label}</div>
      {hint ? <div className="text-[11px] text-zinc-600">{hint}</div> : null}
    </ConsoleCard>
  )

  if (disabled) {
    return card
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left transition hover:border-white/20 hover:bg-zinc-900/60 active:bg-zinc-900/80"
      >
        <ConsoleCard className="flex flex-col gap-1">
          <div className={`tabular-nums text-zinc-50 ${valueClassName}`}>{value}</div>
          <div className="text-xs font-medium text-zinc-400">{label}</div>
          <div className="text-[11px] text-zinc-600">{interactiveHint ?? hint ?? 'Tap for details'}</div>
        </ConsoleCard>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabelledby={sheetTitleId}>
        <h2 id={sheetTitleId} className="text-lg font-semibold text-zinc-50">
          {sheetTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{sheetDescription}</p>

        <div className="mt-4" aria-busy={loading}>
          {loading ? (
            <BottomSheetLoading label={loadingLabel} rows={skeletonRows} />
          ) : loadFailed ? (
            <p className="text-sm text-zinc-500">Could not load details.</p>
          ) : data && (hasContent ? hasContent(data) : true) ? (
            children(data)
          ) : (
            <p className="text-sm text-zinc-500">{emptyMessage}</p>
          )}
        </div>
      </BottomSheet>
    </>
  )
}

export function DetailRow({
  title,
  subtitle,
  meta,
}: {
  title: string
  subtitle?: string
  meta?: string
}) {
  return (
    <ConsoleCard className="min-w-0 text-sm">
      <div className="break-words font-medium text-zinc-100">{title}</div>
      {subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div> : null}
      {meta ? <div className="mt-0.5 text-xs text-zinc-600">{meta}</div> : null}
    </ConsoleCard>
  )
}

export function DetailList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>
}
