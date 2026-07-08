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
import { waitForSignupKick, signupKickGuestFigures } from './signup-kick-animation'
import { ParticipationCelebrationModal } from './participation-celebration-modal'
import { PARTICIPATION_SECTION_MS } from './participation-motion-tokens'

const CONTROLS_CLOSE_MS = PARTICIPATION_SECTION_MS

type ParticipationAction = () => Promise<{ error?: string }>

export type CelebrationPlacement = 'modal' | 'sheet'

type SignupCelebrationOptions = {
  placement?: CelebrationPlacement
  scrollToRoster?: boolean
  guestCount?: number
}

type LeaveCelebrationOptions = {
  guestCount?: number
}

type MotionContextValue = {
  kickActive: boolean
  kickGuestCount: number
  leaveActive: boolean
  leaveGuestCount: number
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
  runLeaveCelebration: (
    action: ParticipationAction,
    accent: string,
    options?: LeaveCelebrationOptions,
  ) => Promise<{ error?: string }>
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
  const [kickGuestCount, setKickGuestCount] = useState(0)
  const [leaveActive, setLeaveActive] = useState(false)
  const [leaveGuestCount, setLeaveGuestCount] = useState(0)
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
      setKickGuestCount(signupKickGuestFigures(options?.guestCount ?? 0))
      setKickActive(true)
      // Start collapsing the join panel immediately so the UI is "ready"
      // by the time the celebration animation finishes.
      setJoinClosing(true)

      const [result] = await Promise.all([action(), waitForSignupKick()])

      setKickActive(false)
      setKickGuestCount(0)
      setCelebrationPlacement(null)

      if (result.error) {
        setJoinClosing(false)
        return result
      }

      await fireConfetti(accent)
      if (options?.scrollToRoster !== false) {
        setPendingRosterScroll(true)
      }
      return {}
    },
    [],
  )

  const runLeaveCelebration = useCallback(
    async (action: ParticipationAction, accent: string, options?: LeaveCelebrationOptions) => {
      setCelebrationAccent(accent)
      setCelebrationPlacement('modal')
      setLeaveGuestCount(signupKickGuestFigures(options?.guestCount ?? 0))
      setLeaveActive(true)
      setControlsClosing(true)
      const controlsTimer = window.setTimeout(() => setControlsClosing(false), CONTROLS_CLOSE_MS)

      const [result] = await Promise.all([action(), waitForLeaveWalk()])

      setLeaveActive(false)
      setLeaveGuestCount(0)
      setCelebrationPlacement(null)

      if (result.error) {
        window.clearTimeout(controlsTimer)
        setControlsClosing(false)
        return result
      }

      setPendingJoinScroll(true)
      return {}
    },
    [],
  )

  const showCelebrationModal =
    celebrationPlacement === 'modal' && (kickActive || leaveActive)

  const value = useMemo(
    () => ({
      kickActive,
      kickGuestCount,
      leaveActive,
      leaveGuestCount,
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
      kickGuestCount,
      leaveActive,
      leaveGuestCount,
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
        kickGuestCount={kickGuestCount}
        leaveActive={leaveActive}
        leaveGuestCount={leaveGuestCount}
      />
    </ParticipationMotionContext.Provider>
  )
}

export function useParticipationMotion() {
  return useContext(ParticipationMotionContext)
}
