'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Participant, MySignup } from '@/lib/participant'
import type { RosterEntry, SignupListStatus } from '@/lib/signups'
import type { RosterBadgeInfo } from '@/lib/badges'
import type { ArrivalStatus } from '@/lib/arrival-status'
import { JoinSectionLazy } from './join-section-lazy'
import { RosterListLazy } from './roster-list-lazy'
import { SignedInControlsLazy } from './signed-in-controls-lazy'
import { WaitlistSection } from './waitlist-section'
import { AnimatedPresenceSection } from './animated-presence-section'
import { ParticipationMotionProvider, useParticipationMotion } from './participation-motion'
import { SignupKickAnimation } from './signup-kick-animation'
import { LeaveWalkAnimation } from './leave-walk-animation'

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
}

type Props = JoinProps & {
  roster: RosterEntry[]
  waitlist: RosterEntry[]
  headcount: number
  isEnded: boolean
  confirmedMySignupId: string | null
  waitlistMySignupId: string | null
  canUpdateStatus: boolean
  mySignup: MySignup | null
  badgesByParticipantId: Record<string, RosterBadgeInfo>
  rosterHeading: string
  cancelledCallout?: ReactNode
}

function ParticipationPanelBody({
  roster,
  waitlist,
  headcount,
  isEnded,
  waitlistEnabled,
  confirmedMySignupId,
  waitlistMySignupId,
  canUpdateStatus,
  mySignup,
  badgesByParticipantId,
  rosterHeading,
  cancelledCallout,
  showJoin,
  joinProps,
}: Props & { showJoin: boolean; joinProps: JoinProps }) {
  const motion = useParticipationMotion()
  const kickActive = motion?.kickActive ?? false
  const leaveActive = motion?.leaveActive ?? false
  const celebrationActive = kickActive || leaveActive
  const celebrationAccent = motion?.celebrationAccent ?? joinProps.accent
  const joinClosing = motion?.joinClosing ?? false
  const controlsClosing = motion?.controlsClosing ?? false
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

  return (
    <div className="relative">
      {celebrationActive ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
          {kickActive ? (
            <SignupKickAnimation accent={celebrationAccent} className="w-full" />
          ) : (
            <LeaveWalkAnimation accent={celebrationAccent} className="w-full" />
          )}
        </div>
      ) : null}

      <div
        className={
          celebrationActive
            ? 'pointer-events-none select-none opacity-20 transition-opacity duration-200'
            : ''
        }
      >
        {cancelledCallout}

        <AnimatedPresenceSection show={showJoin || joinClosing} closing={joinClosing}>
          <JoinSectionLazy {...joinProps} />
        </AnimatedPresenceSection>

        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
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
          />
        ) : null}

        {showControlsSection && controlsSignup ? (
          <AnimatedPresenceSection show={showControls} closing={controlsClosing}>
            <SignedInControlsLazy
              orgSlug={joinProps.orgSlug}
              eventId={joinProps.eventId}
              signupId={controlsSignup.signup_id}
              guestCount={controlsSignup.guest_count}
              arrivalStatus={controlsSignup.arrival_status as ArrivalStatus}
              listStatus={controlsSignup.list_status as SignupListStatus}
              isOnline={joinProps.isOnline}
              accent={joinProps.accent}
            />
          </AnimatedPresenceSection>
        ) : null}
        </section>
      </div>
    </div>
  )
}

export function ParticipationPanel(props: Props) {
  const { mySignup, isEnded, ...rest } = props
  const showJoinInitial = !mySignup && !isEnded
  const [showJoin, setShowJoin] = useState(showJoinInitial)

  useEffect(() => {
    if (mySignup) {
      setShowJoin(false)
      return
    }
    if (!isEnded) {
      setShowJoin(true)
    }
  }, [mySignup, isEnded])

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
  }

  return (
    <ParticipationMotionProvider
      resetKey={mySignup?.signup_id ?? rest.participant?.phone ?? 'unsigned'}
    >
      <ParticipationPanelBody
        {...rest}
        mySignup={mySignup}
        isEnded={isEnded}
        showJoin={showJoin}
        joinProps={joinProps}
      />
    </ParticipationMotionProvider>
  )
}
