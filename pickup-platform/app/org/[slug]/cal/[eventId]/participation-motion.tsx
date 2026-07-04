'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const CONTROLS_CLOSE_MS = 200

type MotionContextValue = {
  controlsClosing: boolean
  dismissSignedInControls: () => void
  reopenSignedInControls: () => void
}

const ParticipationMotionContext = createContext<MotionContextValue | null>(null)

export function ParticipationMotionProvider({
  children,
  resetKey,
}: {
  children: ReactNode
  resetKey: string
}) {
  const [controlsClosing, setControlsClosing] = useState(false)

  useEffect(() => {
    if (resetKey !== 'unsigned') {
      setControlsClosing(false)
    }
  }, [resetKey])

  const dismissSignedInControls = useCallback(() => {
    setControlsClosing(true)
    window.setTimeout(() => setControlsClosing(false), CONTROLS_CLOSE_MS)
  }, [])

  const reopenSignedInControls = useCallback(() => {
    setControlsClosing(false)
  }, [])

  const value = useMemo(
    () => ({
      controlsClosing,
      dismissSignedInControls,
      reopenSignedInControls,
    }),
    [controlsClosing, dismissSignedInControls, reopenSignedInControls],
  )

  return (
    <ParticipationMotionContext.Provider value={value}>{children}</ParticipationMotionContext.Provider>
  )
}

export function useParticipationMotion() {
  return useContext(ParticipationMotionContext)
}

/** Delay before guest/status controls appear — lets roster + confetti land first. */
export const CONTROLS_REVEAL_MS = 480
