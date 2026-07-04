'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type MotionContextValue = {
  joinClosing: boolean
  controlsClosing: boolean
  dismissJoinPanel: () => void
  reopenJoinPanel: () => void
  dismissSignedInControls: () => void
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
    setControlsClosing(false)
  }, [resetKey])

  const dismissJoinPanel = useCallback(() => {
    setJoinClosing(true)
  }, [])

  const reopenJoinPanel = useCallback(() => {
    setJoinClosing(false)
  }, [])

  const dismissSignedInControls = useCallback(() => {
    setControlsClosing(true)
  }, [])

  const value = useMemo(
    () => ({
      joinClosing,
      controlsClosing,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
    }),
    [joinClosing, controlsClosing, dismissJoinPanel, reopenJoinPanel, dismissSignedInControls],
  )

  return (
    <ParticipationMotionContext.Provider value={value}>{children}</ParticipationMotionContext.Provider>
  )
}

export function useParticipationMotion() {
  return useContext(ParticipationMotionContext)
}
