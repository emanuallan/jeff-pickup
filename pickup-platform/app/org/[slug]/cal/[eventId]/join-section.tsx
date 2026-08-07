'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  joinEventWithSession,
  quickJoinEvent,
  clearParticipantSession,
} from './actions'
import { arrowRight } from '@/lib/text-arrows'
import type { Participant, MySignup } from '@/lib/participant'
import { ReturningSignupModal, clearReturningSignupSeen, markReturningSignupPromptSeen } from './returning-signup-modal'
import { GroupRulesSheet } from './group-rules-sheet'
import { ParticipantEmailClaimSheet } from './participant-email-claim-sheet'
import { getGroupRulesJoinStatus } from './group-rules-actions'
import { useParticipationMotion } from './participation-motion'
import { GuestCountField } from './guest-count-select'
import { clampGuestCount } from '@/lib/guest-signups'
import {
  clearParticipantDeviceSession,
} from '@/lib/participant-session-client'
import { formatPriceCents, isPaidSession, sessionPaymentTotalCents } from '@/lib/session-payment'
import { PaidJoinSheet, type KnownParticipantProfile } from './paid-join-sheet'
import { validateDemoParticipantNames } from '@/lib/participant-name-moderation'

const joinNameInputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

function JoinNameFields({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  accent,
}: {
  firstName: string
  lastName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  accent: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-xs text-zinc-500">First name</span>
        <input
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          className={joinNameInputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
      </label>
      <label className="block">
        <span className="text-xs text-zinc-500">Last name</span>
        <input
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          className={joinNameInputClass}
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
      </label>
    </div>
  )
}

function validateJoinNames(
  orgSlug: string,
  firstName: string,
  lastName: string,
): string | null {
  if (!firstName.trim() || !lastName.trim()) {
    return 'Enter your first and last name.'
  }
  return validateDemoParticipantNames(orgSlug, {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    displayName: null,
  })
}

export type { Participant, MySignup }

type Props = {
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
  groupRulesEnabled?: boolean
  groupRulesText?: string
  groupRulesVersion?: number
  needsGroupRulesAcceptance?: boolean
  priceCents?: number | null
  paidSession?: boolean
}

function PaidJoinSection({
  orgSlug,
  eventId,
  accent,
  accentText,
  isFull,
  waitlistEnabled,
  spotsLeft,
  participant,
  priceLabel,
  priceCents,
  eventTitle,
  eventWhen,
  guestsEnabled = true,
  autoOpenSheet = false,
  knownProfile = null,
  showReturning = false,
  onSessionRecovered,
  groupRulesEnabled,
  groupRulesText,
  groupRulesVersion,
  needsGroupRulesAcceptance,
}: Props & {
  priceLabel: string
  priceCents: number
  autoOpenSheet?: boolean
  knownProfile?: KnownParticipantProfile | null
  showReturning?: boolean
  onNotYou?: () => void
  onSessionRecovered?: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(autoOpenSheet)
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimMode, setClaimMode] = useState<'claim' | 'recover'>('claim')
  const [guestCount, setGuestCount] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [localProfile, setLocalProfile] = useState<KnownParticipantProfile | null>(knownProfile)
  const [rulesSheetOpen, setRulesSheetOpen] = useState(false)
  const [rulesAcceptedLocally, setRulesAcceptedLocally] = useState(false)
  const [pendingOpenSheet, setPendingOpenSheet] = useState(false)
  const joiningWaitlist = isFull && waitlistEnabled
  const totalCents = sessionPaymentTotalCents(
    priceCents,
    guestsEnabled ? guestCount : 0,
  )
  const totalLabel = formatPriceCents(totalCents)
  const sheetProfile = localProfile ?? knownProfile
  const verifiedReturning =
    showReturning && participant && Boolean(participant.email_verified_at)

  useEffect(() => {
    if (autoOpenSheet && sheetProfile) setSheetOpen(true)
  }, [autoOpenSheet, sheetProfile])

  useEffect(() => {
    setLocalProfile(knownProfile)
  }, [knownProfile])

  if (isFull && !waitlistEnabled) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/35 px-4 py-4">
        <h2 className="text-lg font-semibold text-zinc-100">This session is full</h2>
      </div>
    )
  }

  async function afterVerified() {
    setClaimOpen(false)
    onSessionRecovered?.()
    startTransition(() => router.refresh())
  }

  const sheet =
    sheetProfile != null ? (
      <PaidJoinSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        orgSlug={orgSlug}
        eventId={eventId}
        accent={accent}
        accentText={accentText}
        priceLabel={priceLabel}
        priceCents={priceCents}
        joiningWaitlist={joiningWaitlist}
        guestsEnabled={guestsEnabled}
        showGuestSelect={false}
        knownProfile={sheetProfile}
        initialGuestCount={guestCount}
        eventTitle={eventTitle}
        eventWhen={eventWhen}
      />
    ) : null

  if (verifiedReturning && participant) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Welcome back, {participant.display_name}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {joiningWaitlist
              ? `This session is full. Pay ${priceLabel} per person to join the waitlist.`
              : spotsLeft != null && spotsLeft <= 5
                ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left — ${priceLabel} per person.`
                : `Tap below to lock in your spot · ${priceLabel} per person.`}
          </p>
        </div>
        {guestsEnabled ? (
          <GuestCountField value={guestCount} onChange={setGuestCount} accent={accent} />
        ) : null}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="join-cta-glow-active relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
          style={{
            backgroundColor: accent,
            color: accentText,
            boxShadow: `0 10px 30px -12px ${accent}`,
          }}
        >
          <span className="relative z-10">
            {joiningWaitlist ? `Join waitlist · ${totalLabel}` : `Join · ${totalLabel}`}
          </span>
        </button>
        {sheet}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {joiningWaitlist ? 'Join the waitlist' : 'Save your spot'}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            You only have to fill these out once.
          </p>
        </div>
        <JoinNameFields
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          accent={accent}
        />
        {guestsEnabled ? (
          <GuestCountField value={guestCount} onChange={setGuestCount} accent={accent} />
        ) : null}
        {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
        <button
          type="button"
          onClick={() => {
            const nameError = validateJoinNames(orgSlug, firstName, lastName)
            if (nameError) {
              setFormError(nameError)
              return
            }
            setFormError(null)
            setClaimMode('claim')
            setClaimOpen(true)
          }}
          className="join-cta-glow-active relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
          style={{
            backgroundColor: accent,
            color: accentText,
            boxShadow: `0 10px 30px -12px ${accent}`,
          }}
        >
          <span className="relative z-10">
            {joiningWaitlist ? `Join waitlist · ${totalLabel}` : `Continue · ${totalLabel}`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFormError(null)
            setClaimMode('recover')
            setClaimOpen(true)
          }}
          className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-300"
        >
          Already previously signed up?
        </button>
      </div>
      <ParticipantEmailClaimSheet
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        orgSlug={orgSlug}
        accent={accent}
        accentText={accentText}
        mode={claimMode}
        initialFirstName={firstName.trim()}
        initialLastName={lastName.trim()}
        onVerified={() => void afterVerified()}
      />
      <GroupRulesSheet
        open={rulesSheetOpen}
        onClose={() => setRulesSheetOpen(false)}
        orgSlug={orgSlug}
        rulesText={groupRulesText ?? ''}
        rulesVersion={groupRulesVersion ?? 0}
        accent={accent}
        accentText={accentText}
        onAccepted={() => {
          setRulesAcceptedLocally(true)
          setRulesSheetOpen(false)
          if (pendingOpenSheet) {
            setPendingOpenSheet(false)
            setSheetOpen(true)
          }
        }}
      />
      {sheet}
    </>
  )
}

export function JoinSection(props: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paidParam = searchParams.get('paid')
  const motion = useParticipationMotion()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [guestCount, setGuestCount] = useState(0)
  const [optedOutOfReturningSession, setOptedOutOfReturningSession] = useState(false)
  const [rulesSheetOpen, setRulesSheetOpen] = useState(false)
  const [rulesPhone, setRulesPhone] = useState<string | null>(null)
  const [rulesAcceptedLocally, setRulesAcceptedLocally] = useState(false)
  const [pendingJoin, setPendingJoin] = useState<(() => Promise<void>) | null>(null)
  const [forcePaidJoin, setForcePaidJoin] = useState(false)
  const [forcedPriceCents, setForcedPriceCents] = useState<number | null>(null)
  const [capturedProfile, setCapturedProfile] = useState<KnownParticipantProfile | null>(null)
  const [paymentCancelled, setPaymentCancelled] = useState(false)
  const [claimSheetOpen, setClaimSheetOpen] = useState(false)
  const [claimMode, setClaimMode] = useState<'claim' | 'recover' | 'upgrade'>('claim')
  const [upgradePromptDismissed, setUpgradePromptDismissed] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // One-shot cancel banner: show once, then strip paid/session_id so date chips
  // (which preserve other query params) don't keep resurfacing it.
  useEffect(() => {
    if (paidParam == null && !searchParams.has('session_id')) return

    if (paidParam === '0') {
      setPaymentCancelled(true)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('paid')
    params.delete('session_id')
    const query = params.toString()
    router.replace(query ? `/?${query}` : '/', { scroll: false })
  }, [paidParam, router, searchParams])

  const requiresGroupRules =
    props.groupRulesEnabled === true &&
    props.needsGroupRulesAcceptance === true &&
    !rulesAcceptedLocally &&
    !!props.groupRulesText &&
    (props.groupRulesVersion ?? 0) > 0

  function openRulesGate(phone: string | null, join: () => Promise<void>) {
    setRulesPhone(phone)
    setPendingJoin(() => join)
    setRulesSheetOpen(true)
  }

  async function completeRulesAcceptance() {
    setRulesAcceptedLocally(true)
    setRulesSheetOpen(false)
    const join = pendingJoin
    setPendingJoin(null)
    if (join) {
      await join()
    }
  }

  const switchToPaidJoin = useCallback((priceCents?: number | null) => {
    if (priceCents != null && priceCents > 0) {
      setForcedPriceCents(priceCents)
    }
    setForcePaidJoin(true)
    setError(null)
    setLoading(false)
  }, [])

  const knownProfile = useMemo<KnownParticipantProfile | null>(() => {
    if (capturedProfile) return capturedProfile
    if (optedOutOfReturningSession || !props.participant) return null
    return {
      firstName: props.participant.first_name,
      lastName: props.participant.last_name,
      phone: props.participant.phone,
      email: props.participant.email ?? null,
    }
  }, [
    capturedProfile,
    optedOutOfReturningSession,
    props.participant?.first_name,
    props.participant?.last_name,
    props.participant?.phone,
    props.participant?.email,
  ])

  useEffect(() => {
    if (!props.participant) {
      setOptedOutOfReturningSession(false)
    }
  }, [props.participant])

  const handleNotYou = useCallback(async () => {
    setOptedOutOfReturningSession(true)
    setCapturedProfile(null)
    setRulesAcceptedLocally(false)
    setError(null)
    clearReturningSignupSeen(props.orgSlug, props.eventId)
    motion?.reopenJoinPanel()

    const cleared = await clearParticipantDeviceSession()
    if ('error' in cleared) {
      setOptedOutOfReturningSession(false)
      setError(cleared.error)
      return
    }

    await clearParticipantSession(props.orgSlug, props.eventId)
    startTransition(() => {
      router.refresh()
    })
  }, [motion, props.eventId, props.orgSlug, router, startTransition])

  // Signed-up users are handled in the roster (highlighted row + status picker
  // below the attendee list), so the join card collapses for them.
  if (props.mySignup) {
    return null
  }

  const effectivePriceCents = forcedPriceCents ?? props.priceCents
  const paidSession =
    forcePaidJoin || props.paidSession === true || isPaidSession(effectivePriceCents)
  const priceLabel = isPaidSession(effectivePriceCents)
    ? formatPriceCents(effectivePriceCents ?? 0)
    : 'the session fee'

  if (paidSession) {
    return (
      <>
        {paymentCancelled ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
            Payment was not completed. You can try again when you’re ready.
          </p>
        ) : null}
        <PaidJoinSection
          {...props}
          priceCents={effectivePriceCents ?? 0}
          priceLabel={priceLabel}
          autoOpenSheet={forcePaidJoin}
          knownProfile={knownProfile}
          showReturning={Boolean(props.participant) && !optedOutOfReturningSession}
          onNotYou={() => void handleNotYou()}
          onSessionRecovered={() => {
            setOptedOutOfReturningSession(false)
            motion?.reopenJoinPanel()
          }}
        />
      </>
    )
  }

  const joiningWaitlist = props.isFull && props.waitlistEnabled
  const guestsEnabled = props.guestsEnabled !== false
  const isNewUserJoinPath = !props.participant || optedOutOfReturningSession
  const needsEmailUpgrade =
    Boolean(props.participant) &&
    !optedOutOfReturningSession &&
    !props.participant?.email_verified_at &&
    !upgradePromptDismissed

  async function sessionNeedsGroupRulesAcceptance(): Promise<boolean> {
    if (!props.groupRulesEnabled || !props.groupRulesText || (props.groupRulesVersion ?? 0) <= 0) {
      return false
    }
    if (rulesAcceptedLocally) {
      return false
    }
    const status = await getGroupRulesJoinStatus(props.orgSlug)
    return status.needs_acceptance === true
  }

  async function runSessionJoin(guests: number) {
    if (!motion?.runSignupCelebration) return
    setLoading(true)
    setError(null)
    const result = await motion.runSignupCelebration(
      () => joinEventWithSession(props.orgSlug, props.eventId, guests),
      props.accent,
      { guestCount: guests },
    )
    setLoading(false)
    if (!result.error) {
      markReturningSignupPromptSeen(props.orgSlug, props.eventId)
      startTransition(() => {
        router.refresh()
      })
      return
    }
    if (
      result.code === 'payment_required' ||
      result.error.toLowerCase().includes('requires payment')
    ) {
      switchToPaidJoin(result.priceCents)
      return
    }
    setError(result.error)
  }

  async function handleClaimVerified() {
    setClaimSheetOpen(false)
    setOptedOutOfReturningSession(false)
    const guests = guestsEnabled ? clampGuestCount(guestCount) : 0

    const finish = async () => {
      await runSessionJoin(guests)
    }

    if (await sessionNeedsGroupRulesAcceptance()) {
      openRulesGate(null, finish)
      return
    }
    await finish()
  }

  if (props.participant && !optedOutOfReturningSession) {
    const welcomeBack = (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Welcome back, {props.participant.display_name}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {joiningWaitlist
              ? 'This session is full. Join the waitlist and we’ll move you up automatically if a spot opens.'
              : props.spotsLeft != null && props.spotsLeft <= 5
                ? `Only ${props.spotsLeft} spot${props.spotsLeft === 1 ? '' : 's'} left — tap to lock yours in.`
                : 'Tap below to lock in your spot.'}
          </p>
        </div>

        {needsEmailUpgrade ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-3">
            <p className="text-sm text-zinc-300">
              Add a verified email so you can sign back in on any device.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setClaimMode('upgrade')
                  setClaimSheetOpen(true)
                }}
                className="text-xs font-medium underline underline-offset-2"
                style={{ color: props.accent }}
              >
                Verify email
              </button>
              <button
                type="button"
                onClick={() => setUpgradePromptDismissed(true)}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}

        {guestsEnabled ? (
          <GuestCountField
            value={guestCount}
            onChange={setGuestCount}
            accent={props.accent}
          />
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            const runQuickJoin = async () => {
              await runSessionJoin(guestCount)
            }

            if (requiresGroupRules) {
              openRulesGate(null, runQuickJoin)
              return
            }

            await runQuickJoin()
          }}
          className="join-cta-glow-active relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: props.accent,
            color: props.accentText,
            boxShadow: `0 10px 30px -12px ${props.accent}`,
          }}
        >
          <span className="relative z-10">
            {loading ? 'Counting you in…' : joiningWaitlist ? 'Join waitlist' : `Count me in ${arrowRight}`}
          </span>
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    )

    if (props.returningSignupModalEnabled) {
      return (
        <>
          <ReturningSignupModal
            orgSlug={props.orgSlug}
            orgId={props.orgId}
            eventId={props.eventId}
            accent={props.accent}
            accentText={props.accentText}
            firstName={props.participant.first_name}
            eventTitle={props.eventTitle}
            eventWhen={props.eventWhen}
            locationLabel={props.locationLabel}
            locationMapsUrl={props.locationMapsUrl}
            groupRulesEnabled={props.groupRulesEnabled}
            groupRulesText={props.groupRulesText}
            groupRulesVersion={props.groupRulesVersion}
            needsGroupRulesAcceptance={props.needsGroupRulesAcceptance}
            onNotYou={() => void handleNotYou()}
            onPaymentRequired={switchToPaidJoin}
          >
            {welcomeBack}
          </ReturningSignupModal>
          <GroupRulesSheet
            open={rulesSheetOpen}
            onClose={() => {
              setRulesSheetOpen(false)
              setPendingJoin(null)
            }}
            orgSlug={props.orgSlug}
            rulesText={props.groupRulesText ?? ''}
            rulesVersion={props.groupRulesVersion ?? 0}
            phone={rulesPhone}
            accent={props.accent}
            accentText={props.accentText}
            onAccepted={() => void completeRulesAcceptance()}
          />
          <ParticipantEmailClaimSheet
            open={claimSheetOpen}
            onClose={() => setClaimSheetOpen(false)}
            orgSlug={props.orgSlug}
            accent={props.accent}
            accentText={props.accentText}
            mode={claimMode}
            bindParticipantId={
              claimMode === 'upgrade' ? props.participant.participant_id ?? null : null
            }
            initialFirstName={props.participant.first_name}
            initialLastName={props.participant.last_name}
            initialEmail={props.participant.email ?? ''}
            onVerified={async () => {
              setClaimSheetOpen(false)
              setUpgradePromptDismissed(true)
              startTransition(() => router.refresh())
            }}
          />
        </>
      )
    }

    return (
      <>
        {welcomeBack}
        <GroupRulesSheet
          open={rulesSheetOpen}
          onClose={() => {
            setRulesSheetOpen(false)
            setPendingJoin(null)
          }}
          orgSlug={props.orgSlug}
          rulesText={props.groupRulesText ?? ''}
          rulesVersion={props.groupRulesVersion ?? 0}
          phone={rulesPhone}
          accent={props.accent}
          accentText={props.accentText}
          onAccepted={() => void completeRulesAcceptance()}
        />
        <ParticipantEmailClaimSheet
          open={claimSheetOpen}
          onClose={() => setClaimSheetOpen(false)}
          orgSlug={props.orgSlug}
          accent={props.accent}
          accentText={props.accentText}
          mode={claimMode}
          bindParticipantId={
            claimMode === 'upgrade' ? props.participant.participant_id ?? null : null
          }
          initialFirstName={props.participant.first_name}
          initialLastName={props.participant.last_name}
          initialEmail={props.participant.email ?? ''}
          onVerified={async () => {
            setClaimSheetOpen(false)
            setUpgradePromptDismissed(true)
            startTransition(() => router.refresh())
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {joiningWaitlist ? 'Join the waitlist' : 'Save your spot'}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {joiningWaitlist
              ? 'This session is full. You’ll be added in signup order and promoted automatically if a spot opens.'
              : 'You only have to fill these out once.'}
          </p>
        </div>

        <JoinNameFields
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          accent={props.accent}
        />

        {guestsEnabled ? (
          <GuestCountField value={guestCount} onChange={setGuestCount} accent={props.accent} />
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const nameError = validateJoinNames(props.orgSlug, firstName, lastName)
            if (nameError) {
              setError(nameError)
              return
            }
            setError(null)
            setClaimMode('claim')
            setClaimSheetOpen(true)
          }}
          className="join-cta-glow-active relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: props.accent,
            color: props.accentText,
            boxShadow: `0 10px 30px -12px ${props.accent}`,
          }}
        >
          <span className="relative z-10">
            {joiningWaitlist ? 'Join waitlist' : `Count me in ${arrowRight}`}
          </span>
        </button>

        <div className="border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setClaimMode('recover')
              setClaimSheetOpen(true)
            }}
            className="text-xs text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-300"
          >
            Already previously signed up?
          </button>
        </div>
      </div>

      <ParticipantEmailClaimSheet
        open={claimSheetOpen}
        onClose={() => setClaimSheetOpen(false)}
        orgSlug={props.orgSlug}
        accent={props.accent}
        accentText={props.accentText}
        mode={claimMode}
        initialFirstName={firstName.trim()}
        initialLastName={lastName.trim()}
        onVerified={() => void handleClaimVerified()}
      />

      <GroupRulesSheet
        open={rulesSheetOpen}
        onClose={() => {
          setRulesSheetOpen(false)
          setPendingJoin(null)
        }}
        orgSlug={props.orgSlug}
        rulesText={props.groupRulesText ?? ''}
        rulesVersion={props.groupRulesVersion ?? 0}
        phone={rulesPhone}
        accent={props.accent}
        accentText={props.accentText}
        onAccepted={() => void completeRulesAcceptance()}
      />
    </>
  )
}
