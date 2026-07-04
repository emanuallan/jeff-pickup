'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const CONTROLS_CLOSE_MS = 280

type MotionContextValue = {
  joinClosing: boolean
  controlsClosing: boolean
  dismissJoinPanel: () => void
  reopenJoinPanel: () => void
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
  const [joinClosing, setJoinClosing] = useState(false)
  const [controlsClosing, setControlsClosing] = useState(false)

  useEffect(() => {
    setJoinClosing(false)
    // Leave sets resetKey to "unsigned" while controls are still animating out.
    if (resetKey !== 'unsigned') {
      setControlsClosing(false)
    }
  }, [resetKey])

  const dismissJoinPanel = useCallback(() => {
    setJoinClosing(true)
  }, [])

  const reopenJoinPanel = useCallback(() => {
    setJoinClosing(false)
  }, [])

  const dismissSignedInControls = useCallback(() => {
    setControlsClosing(true)
    window.setTimeout(() => setControlsClosing(false), CONTROLS_CLOSE_MS)
  }, [])

  const reopenSignedInControls = useCallback(() => {
    setControlsClosing(false)
  }, [])

  const value = useMemo(
    () => ({
      joinClosing,
      controlsClosing,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
      reopenSignedInControls,
    }),
    [
      joinClosing,
      controlsClosing,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
      reopenSignedInControls,
    ],
  )

  return (
    <ParticipationMotionContext.Provider value={value}>{children}</ParticipationMotionContext.Provider>
  )
}

export function useParticipationMotion() {
  return useContext(ParticipationMotionContext)
}
