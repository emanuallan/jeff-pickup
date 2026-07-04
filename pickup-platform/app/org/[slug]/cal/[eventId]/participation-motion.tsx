'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fireConfetti } from '@/lib/confetti'
import { waitForSignupKick } from './signup-kick-animation'

const CONTROLS_CLOSE_MS = 280

type SignupAction = () => Promise<{ error?: string }>

type MotionContextValue = {
  kickActive: boolean
  kickAccent: string
  joinClosing: boolean
  controlsClosing: boolean
  runSignupCelebration: (action: SignupAction, accent: string) => Promise<{ error?: string }>
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
  const [kickActive, setKickActive] = useState(false)
  const [kickAccent, setKickAccent] = useState('#2563eb')
  const [joinClosing, setJoinClosing] = useState(false)
  const [controlsClosing, setControlsClosing] = useState(false)

  useEffect(() => {
    setJoinClosing(false)
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

  const runSignupCelebration = useCallback(
    async (action: SignupAction, accent: string) => {
      setKickAccent(accent)
      setKickActive(true)

      const [result] = await Promise.all([action(), waitForSignupKick()])

      setKickActive(false)

      if (result.error) {
        return result
      }

      await fireConfetti(accent)
      setJoinClosing(true)
      return {}
    },
    [],
  )

  const value = useMemo(
    () => ({
      kickActive,
      kickAccent,
      joinClosing,
      controlsClosing,
      runSignupCelebration,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
      reopenSignedInControls,
    }),
    [
      kickActive,
      kickAccent,
      joinClosing,
      controlsClosing,
      runSignupCelebration,
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
