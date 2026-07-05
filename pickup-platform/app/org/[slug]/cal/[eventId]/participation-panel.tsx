'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Participant, MySignup } from '@/lib/participant'
import type { RosterEntry, SignupListStatus } from '@/lib/signups'
import type { RosterBadgeInfo } from '@/lib/badges'
import type { ArrivalStatus } from '@/lib/arrival-status'
import { JoinSectionLazy } from './join-section-lazy'
import { RosterListLazy } from './roster-list-lazy'
import { WaitlistSection } from './waitlist-section'
import { SignedInStatusSheet } from './signed-in-status-sheet'
import { SignedInGuestSection } from './signed-in-guest-section'
import { SignupConfirmationCard } from './signup-confirmation-card'
import { AnimatedPresenceSection } from './animated-presence-section'
import { ParticipationMotionProvider, useParticipationMotion } from './participation-motion'
import {
  EVENT_JOIN_SECTION_ID,
  scrollToJoinSectionAfterLeave,
} from './scroll-to-my-roster'

type JoinProps = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  isFull: boolean
  waitlistEnabled: boolean
  isOnline: boolean
  spotsLeft: number | null
  participant: Participant | null
  mySignup: MySignup | null
  eventTitle: string
  eventWhen: string
  locationLabel: string
  locationMapsUrl: string | null
  returningSignupModalEnabled: boolean
  guestsEnabled?: boolean
}

type Props = JoinProps & {
  roster: RosterEntry[]
  waitlist: RosterEntry[]
  headcount: number
  isEnded: boolean
  isCancelled?: boolean
  confirmedMySignupId: string | null
  waitlistMySignupId: string | null
  canUpdateStatus: boolean
  mySignup: MySignup | null
  badgesByParticipantId: Record<string, RosterBadgeInfo>
  rosterHeading: string
  cancelledCallout?: ReactNode
  publicRosterEnabled?: boolean
  guestsEnabled?: boolean
}

function ParticipationPanelBody({
  roster,
  waitlist,
  headcount,
  isEnded,
  isCancelled = false,
  waitlistEnabled,
  confirmedMySignupId,
  waitlistMySignupId,
  canUpdateStatus,
  mySignup,
  badgesByParticipantId,
  rosterHeading,
  cancelledCallout,
  publicRosterEnabled = true,
  guestsEnabled = true,
  showJoin,
  joinProps,
}: Props & { showJoin: boolean; joinProps: JoinProps }) {
  const motion = useParticipationMotion()
  const joinClosing = motion?.joinClosing ?? false
  const controlsClosing = motion?.controlsClosing ?? false
  const [statusSheetOpen, setStatusSheetOpen] = useState(false)
  const showControls = Boolean(mySignup && canUpdateStatus)
  const lastControlsSignupRef = useRef<MySignup | null>(null)

  if (mySignup && canUpdateStatus) {
    lastControlsSignupRef.current = mySignup
  }

  useEffect(() => {
    if (!controlsClosing && !mySignup) {
      lastControlsSignupRef.current = null
    }
  }, [controlsClosing, mySignup])

  const controlsSignup =
    mySignup && canUpdateStatus ? mySignup : controlsClosing ? lastControlsSignupRef.current : null
  const showControlsSection = Boolean(controlsSignup && (showControls || controlsClosing))
  const isWaitlisted = mySignup?.list_status === 'waitlisted'
  const openStatusSheet =
    showControls && !isWaitlisted ? () => setStatusSheetOpen(true) : undefined
  const showConfirmation = Boolean(mySignup && !isCancelled && !isEnded && !joinClosing)
  const showRoster = publicRosterEnabled && !isCancelled
  const showJoinPanel = (showJoin || joinClosing) && !(controlsClosing && !mySignup)

  useEffect(() => {
    if (!mySignup || !canUpdateStatus) {
      setStatusSheetOpen(false)
    }
  }, [mySignup, canUpdateStatus])

  useEffect(() => {
    if (!motion?.pendingJoinScroll || !showJoinPanel || joinClosing) {
      return
    }

    scrollToJoinSectionAfterLeave(motion.clearPendingJoinScroll)
  }, [motion?.pendingJoinScroll, motion?.clearPendingJoinScroll, showJoinPanel, joinClosing])

  return (
    <div className="relative">
      <div className="flex flex-col gap-5 [&_section]:!mt-0">
        {cancelledCallout}

        {showJoinPanel ? (
          <div id={EVENT_JOIN_SECTION_ID}>
            <AnimatedPresenceSection show={showJoin || joinClosing} closing={joinClosing}>
              <JoinSectionLazy {...joinProps} />
            </AnimatedPresenceSection>
          </div>
        ) : null}

        {showConfirmation && mySignup ? (
          <SignupConfirmationCard
            participant={joinProps.participant}
            mySignup={mySignup}
            accent={joinProps.accent}
            orgSlug={joinProps.orgSlug}
            eventId={joinProps.eventId}
            isOnline={joinProps.isOnline}
            isWaitlisted={isWaitlisted}
            canLeave={!isEnded}
            canUpdateStatus={canUpdateStatus}
            onOpenStatusSheet={openStatusSheet}
            showAccountActions={!showRoster}
            listStatus={mySignup.list_status as SignupListStatus}
            guestsEnabled={guestsEnabled}
          />
        ) : null}

        {showRoster ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {rosterHeading}{' '}
          <span key={headcount} className="participation-headcount inline-block tabular-nums">
            ({headcount})
          </span>
        </h2>
        <div className="mt-4">
          <RosterListLazy
            entries={roster}
            badgesByParticipantId={badgesByParticipantId}
            isOnline={joinProps.isOnline}
            mySignupId={confirmedMySignupId}
            canLeave={!isEnded}
            orgSlug={joinProps.orgSlug}
            eventId={joinProps.eventId}
            accent={joinProps.accent}
            onOpenStatusSheet={openStatusSheet}
          />
        </div>

        {waitlistEnabled ? (
          <WaitlistSection
            waitlist={waitlist}
            mySignupId={waitlistMySignupId}
            canLeave={!isEnded}
            orgSlug={joinProps.orgSlug}
            eventId={joinProps.eventId}
            accent={joinProps.accent}
            isOnline={joinProps.isOnline}
          />
        ) : null}

        {showControlsSection && controlsSignup ? (
          <AnimatedPresenceSection show={showControls} closing={controlsClosing}>
            <SignedInGuestSection
              orgSlug={joinProps.orgSlug}
              eventId={joinProps.eventId}
              signupId={controlsSignup.signup_id}
              guestCount={controlsSignup.guest_count}
              listStatus={controlsSignup.list_status as SignupListStatus}
              accent={joinProps.accent}
              guestsEnabled={guestsEnabled}
            />
          </AnimatedPresenceSection>
        ) : null}

        {showControls && mySignup && !isWaitlisted ? (
          <SignedInStatusSheet
            open={statusSheetOpen}
            onClose={() => setStatusSheetOpen(false)}
            orgSlug={joinProps.orgSlug}
            eventId={joinProps.eventId}
            signupId={mySignup.signup_id}
            arrivalStatus={mySignup.arrival_status as ArrivalStatus}
            isOnline={joinProps.isOnline}
            accent={joinProps.accent}
          />
        ) : null}
        </section>
        ) : null}

        {!showRoster && showControls && mySignup && !isWaitlisted ? (
          <SignedInStatusSheet
            open={statusSheetOpen}
            onClose={() => setStatusSheetOpen(false)}
            orgSlug={joinProps.orgSlug}
            eventId={joinProps.eventId}
            signupId={mySignup.signup_id}
            arrivalStatus={mySignup.arrival_status as ArrivalStatus}
            isOnline={joinProps.isOnline}
            accent={joinProps.accent}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ParticipationPanel(props: Props) {
  const { mySignup, isEnded, isCancelled = false, ...rest } = props
  const canJoin = !mySignup && !isEnded && !isCancelled
  const [showJoin, setShowJoin] = useState(canJoin)

  useEffect(() => {
    if (mySignup || isCancelled) {
      setShowJoin(false)
      return
    }
    if (!isEnded) {
      setShowJoin(true)
    }
  }, [mySignup, isEnded, isCancelled])

  const joinProps: JoinProps = {
    orgSlug: rest.orgSlug,
    orgId: rest.orgId,
    eventId: rest.eventId,
    accent: rest.accent,
    accentText: rest.accentText,
    isFull: rest.isFull,
    waitlistEnabled: rest.waitlistEnabled,
    isOnline: rest.isOnline,
    spotsLeft: rest.spotsLeft,
    participant: rest.participant,
    mySignup,
    eventTitle: rest.eventTitle,
    eventWhen: rest.eventWhen,
    locationLabel: rest.locationLabel,
    locationMapsUrl: rest.locationMapsUrl,
    returningSignupModalEnabled: rest.returningSignupModalEnabled,
    guestsEnabled: rest.guestsEnabled,
  }

  return (
    <ParticipationMotionProvider
      resetKey={mySignup?.signup_id ?? rest.participant?.phone ?? 'unsigned'}
    >
      <ParticipationPanelBody
        {...rest}
        mySignup={mySignup}
        isEnded={isEnded}
        isCancelled={isCancelled}
        showJoin={showJoin}
        joinProps={joinProps}
      />
    </ParticipationMotionProvider>
  )
}
