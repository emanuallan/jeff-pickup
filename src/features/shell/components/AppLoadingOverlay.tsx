import { useAppInitialLoadOverlay } from '../../../app/hooks/useAppInitialLoad'
import { t, type Lang } from '../../../lib/i18n'

function SoccerBallIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.25" />
      <path
        fill="#18181b"
        d="M32 10.5 36.2 19.8 46.4 16.8 42.5 26.8 50.8 33.5 40.6 36.5 36.4 45.8 32 37.5 27.6 45.8 23.4 36.5 13.2 33.5 21.5 26.8 17.6 16.8 27.8 19.8Z"
      />
      <path
        fill="#18181b"
        d="M14 38c2.8-6.2 8.6-10.4 15.2-11.8-.6 2.6-1 5.3-1 8.1 0 2.4.3 4.8.9 7-6.8-.8-12.4-1.8-15.1-3.3Z"
      />
      <path
        fill="#18181b"
        d="M50 38c-2.8-6.2-8.6-10.4-15.2-11.8.6 2.6 1 5.3 1 8.1 0 2.4-.3 4.8-.9 7 6.8-.8 12.4-1.8 15.1-3.3Z"
      />
      <path
        fill="#18181b"
        d="M32 52c-4.2-4.8-6.8-11-7.4-17.6h14.8c-.6 6.6-3.2 12.8-7.4 17.6Z"
      />
    </svg>
  )
}

export function AppLoadingOverlay(props: { playDate: string; lang: Lang }) {
  const show = useAppInitialLoadOverlay(props.playDate)

  if (!show) return null

  const loadingLabel = t(props.lang, 'loading')

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/92 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={loadingLabel}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="animate-spin drop-shadow-[0_0_24px_rgba(210,163,74,0.35)]">
          <SoccerBallIcon className="h-20 w-20 sm:h-24 sm:w-24" />
        </div>
        <div className="text-sm font-medium text-[var(--muted)]">{loadingLabel}</div>
      </div>
    </div>
  )
}
