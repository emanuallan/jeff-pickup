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
import { waitForLeaveWalk } from './leave-walk-animation'
import { waitForSignupKick } from './signup-kick-animation'
import { ParticipationCelebrationModal } from './participation-celebration-modal'

const CONTROLS_CLOSE_MS = 280

type ParticipationAction = () => Promise<{ error?: string }>

export type CelebrationPlacement = 'modal' | 'sheet'

type SignupCelebrationOptions = {
  placement?: CelebrationPlacement
  scrollToRoster?: boolean
}

type MotionContextValue = {
  kickActive: boolean
  leaveActive: boolean
  celebrationPlacement: CelebrationPlacement | null
  celebrationAccent: string
  joinClosing: boolean
  controlsClosing: boolean
  pendingRosterScroll: boolean
  clearPendingRosterScroll: () => void
  pendingJoinScroll: boolean
  clearPendingJoinScroll: () => void
  runSignupCelebration: (
    action: ParticipationAction,
    accent: string,
    options?: SignupCelebrationOptions,
  ) => Promise<{ error?: string }>
  runLeaveCelebration: (action: ParticipationAction, accent: string) => Promise<{ error?: string }>
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
  const [leaveActive, setLeaveActive] = useState(false)
  const [celebrationPlacement, setCelebrationPlacement] = useState<CelebrationPlacement | null>(
    null,
  )
  const [celebrationAccent, setCelebrationAccent] = useState('#2563eb')
  const [joinClosing, setJoinClosing] = useState(false)
  const [controlsClosing, setControlsClosing] = useState(false)
  const [pendingRosterScroll, setPendingRosterScroll] = useState(false)
  const [pendingJoinScroll, setPendingJoinScroll] = useState(false)

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

  const clearPendingRosterScroll = useCallback(() => {
    setPendingRosterScroll(false)
  }, [])

  const clearPendingJoinScroll = useCallback(() => {
    setPendingJoinScroll(false)
  }, [])

  const runSignupCelebration = useCallback(
    async (action: ParticipationAction, accent: string, options?: SignupCelebrationOptions) => {
      const placement = options?.placement ?? 'modal'
      setCelebrationAccent(accent)
      setCelebrationPlacement(placement)
      setKickActive(true)

      const [result] = await Promise.all([action(), waitForSignupKick()])

      setKickActive(false)
      setCelebrationPlacement(null)

      if (result.error) {
        return result
      }

      await fireConfetti(accent)
      if (options?.scrollToRoster !== false) {
        setPendingRosterScroll(true)
      }
      setJoinClosing(true)
      return {}
    },
    [],
  )

  const runLeaveCelebration = useCallback(
    async (action: ParticipationAction, accent: string) => {
      setCelebrationAccent(accent)
      setCelebrationPlacement('modal')
      setLeaveActive(true)
      setControlsClosing(true)

      const [result] = await Promise.all([action(), waitForLeaveWalk()])

      setLeaveActive(false)
      setCelebrationPlacement(null)

      if (result.error) {
        setControlsClosing(false)
        return result
      }

      setPendingJoinScroll(true)
      window.setTimeout(() => setControlsClosing(false), CONTROLS_CLOSE_MS)
      return {}
    },
    [],
  )

  const showCelebrationModal =
    celebrationPlacement === 'modal' && (kickActive || leaveActive)

  const value = useMemo(
    () => ({
      kickActive,
      leaveActive,
      celebrationPlacement,
      celebrationAccent,
      joinClosing,
      controlsClosing,
      pendingRosterScroll,
      clearPendingRosterScroll,
      pendingJoinScroll,
      clearPendingJoinScroll,
      runSignupCelebration,
      runLeaveCelebration,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
      reopenSignedInControls,
    }),
    [
      kickActive,
      leaveActive,
      celebrationPlacement,
      celebrationAccent,
      joinClosing,
      controlsClosing,
      pendingRosterScroll,
      clearPendingRosterScroll,
      pendingJoinScroll,
      clearPendingJoinScroll,
      runSignupCelebration,
      runLeaveCelebration,
      dismissJoinPanel,
      reopenJoinPanel,
      dismissSignedInControls,
      reopenSignedInControls,
    ],
  )

  return (
    <ParticipationMotionContext.Provider value={value}>
      {children}
      <ParticipationCelebrationModal
        open={showCelebrationModal}
        accent={celebrationAccent}
        kickActive={kickActive}
        leaveActive={leaveActive}
      />
    </ParticipationMotionContext.Provider>
  )
}

export function useParticipationMotion() {
  return useContext(ParticipationMotionContext)
}
