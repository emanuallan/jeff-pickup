'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { OrganizrToast, type OrganizrToastVariant } from '@/app/_components/organizr-toast'

type ToastState = {
  message: string
  variant: OrganizrToastVariant
} | null

type ConsoleToastApi = {
  success: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
}

const ConsoleToastContext = createContext<ConsoleToastApi | null>(null)

export function ConsoleToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)

  const show = useCallback((message: string, variant: OrganizrToastVariant) => {
    setToast({ message, variant })
  }, [])

  const api = useMemo<ConsoleToastApi>(
    () => ({
      success: (message) => show(message, 'success'),
      warning: (message) => show(message, 'warning'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  )

  return (
    <ConsoleToastContext.Provider value={api}>
      {children}
      {toast ? (
        <OrganizrToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </ConsoleToastContext.Provider>
  )
}

export function useConsoleToast(): ConsoleToastApi {
  const ctx = useContext(ConsoleToastContext)
  if (!ctx) {
    throw new Error('useConsoleToast must be used within ConsoleToastProvider')
  }
  return ctx
}
