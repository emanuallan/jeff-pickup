import { useEffect, useMemo, useState } from 'react'
import { SignupForm } from '../../signups/SignupForm'
import { SignupList } from '../../signups/SignupList'
import { t, type Lang } from '../../../lib/i18n'
import { useLocalStorageState } from '../../../app/hooks/useLocalStorageState'
import { loadPlayerName, savePlayerName } from '../../../lib/storage'
import { clearDeleteToken, loadDeleteToken, newUuid, saveDeleteToken } from '../../../lib/tokens'
import { supabase } from '../../../lib/supabase'
import { toAppError } from '../../../api/errors'
import { fireConfetti } from '../../../app/hooks/useConfettiOnNewSignups'
import { useRosterQuery, useCreateSignupMutation, useUnregisterSignupMutation } from '../queries'
import { useActiveLocationQuery, useGameStatusQuery, useMinPlayersQuery } from '../../settings/queries'
import type { LocationId } from '../../signups/types'
import { GameStatusCard } from './GameStatusCard'

export function SignupSection(props: {
  lang: Lang
  playDate: string
  onTapAdminTitle?: () => void
}) {
  const [playerName, setPlayerName] = useLocalStorageState({ load: loadPlayerName, save: savePlayerName })
  const [guestCount, setGuestCount] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const cleanedName = useMemo(
    () => playerName.trim().replace(/\s+/g, ' '),
    [playerName],
  )

  const rosterQuery = useRosterQuery({ playDate: props.playDate, refetchIntervalMs: 30_000 })
  const signups = rosterQuery.data ?? []
  const loading = rosterQuery.isLoading && !rosterQuery.data

  useEffect(() => {
    if (!rosterQuery.data) return
    if (rosterQuery.isError) setError(t(props.lang, 'couldNotLoad'))
  }, [props.lang, rosterQuery.data, rosterQuery.isError])

  const activeLocationQuery = useActiveLocationQuery()
  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'

  const createSignupMutation = useCreateSignupMutation({ playDate: props.playDate })
  const unregisterSignupMutation = useUnregisterSignupMutation({ playDate: props.playDate })

  const submitting = createSignupMutation.isPending || unregisterSignupMutation.isPending
  const disabled = !supabase

  const mySignup = useMemo(() => {
    const n = cleanedName.toLowerCase()
    if (!n) return null
    return signups.find((s) => s.player_name.trim().toLowerCase() === n) ?? null
  }, [cleanedName, signups])

  const myDeleteToken = useMemo(() => {
    if (!cleanedName) return ''
    return loadDeleteToken({ playDate: props.playDate, playerName: cleanedName })
  }, [cleanedName, props.playDate])

  const joined = Boolean(mySignup)
  const canUnregister = Boolean(mySignup && myDeleteToken)

  const gameStatusQuery = useGameStatusQuery()
  const minPlayersQuery = useMinPlayersQuery()

  const rosterGoal = minPlayersQuery.data ?? 10

  const rosterHeadcount = useMemo(() => {
    return signups.reduce((sum, s) => sum + 1 + Math.max(0, s.guest_count ?? 0), 0)
  }, [signups])

  return (
    <>
      <GameStatusCard
        lang={props.lang}
        status={gameStatusQuery.data ?? 'tentative'}
        headcount={rosterHeadcount}
        minPlayers={rosterGoal}
        onTapTitle={props.onTapAdminTitle}
      />

      {!joined ? (
        <SignupForm
          labels={{
            joinTheList: t(props.lang, 'joinTheList'),
            yourName: t(props.lang, 'yourName'),
            namePlaceholder: t(props.lang, 'namePlaceholder'),
            enterName: t(props.lang, 'enterName'),
            keepUnder40:
              props.lang === 'es'
                ? 'Por favor usa menos de 40 caracteres.'
                : 'Please keep it under 40 characters.',
            bringingGuests: t(props.lang, 'bringingGuests'),
            bringingGuestsPlaceholder: t(props.lang, 'bringingGuestsPlaceholder'),
            invalidGuests: t(props.lang, 'invalidGuests'),
            joinTodaysList: t(props.lang, 'joinTodaysList'),
            joinList: t(props.lang, 'joinList'),
            youAreIn: t(props.lang, 'youAreIn'),
          }}
          value={{ playDate: props.playDate, playerName, guestCount }}
          onChange={(next) => {
            setPlayerName(next.playerName)
            setGuestCount(next.guestCount)
          }}
          disabled={disabled || submitting}
          joined={joined}
          error={error ?? undefined}
          onSubmit={async () => {
            if (!supabase) return
            if (mySignup) return
            if (!cleanedName) {
              setError(t(props.lang, 'enterName'))
              return
            }

            const rawGuests = guestCount.trim()
            const guestsParsed = rawGuests ? Number.parseInt(rawGuests, 10) : 0
            if (!Number.isFinite(guestsParsed) || guestsParsed < 0 || guestsParsed > 20) {
              setError(t(props.lang, 'invalidGuests'))
              return
            }

            setError(null)
            try {
              const deleteToken = newUuid()
              await createSignupMutation.mutateAsync({
                playDate: props.playDate,
                location: activeLocation,
                playerName: cleanedName,
                guestCount: guestsParsed,
                deleteToken,
              })
              void fireConfetti()
              saveDeleteToken({
                playDate: props.playDate,
                playerName: cleanedName,
                deleteToken,
              })
              setPlayerName(cleanedName)
              setGuestCount('0')
            } catch (e: unknown) {
              const err = toAppError(e)
              if (err.code === 'CONSTRAINT_UNIQUE') {
                setError(t(props.lang, 'alreadyOnList'))
              } else {
                setError(t(props.lang, 'couldNotAdd'))
              }
            }
          }}
        />
      ) : null}

      <SignupList
        labels={{
          players: t(props.lang, 'players'),
          total: t(props.lang, 'total'),
          loading: t(props.lang, 'loading'),
          emptyList: t(props.lang, 'emptyList'),
          unregister: t(props.lang, 'unregister'),
          unregisterHint: t(props.lang, 'unregisterHint'),
          goal: t(props.lang, 'goal'),
          walkOnsHint: t(props.lang, 'walkOnsHint'),
          guestsTag: t(props.lang, 'guestsTag'),
        }}
        signups={signups}
        loading={loading}
        goal={rosterGoal}
        mySignupId={mySignup?.id}
        canUnregister={canUnregister}
        onUnregister={
          mySignup && myDeleteToken
            ? async () => {
                setError(null)
                try {
                  await unregisterSignupMutation.mutateAsync({
                    signupId: mySignup.id,
                    deleteToken: myDeleteToken,
                  })
                  clearDeleteToken({ playDate: props.playDate, playerName: cleanedName })
                } catch {
                  setError(t(props.lang, 'couldNotRemove'))
                }
              }
            : undefined
        }
      />
    </>
  )
}

