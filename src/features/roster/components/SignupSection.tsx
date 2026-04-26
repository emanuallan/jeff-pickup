import { useEffect, useMemo, useState } from 'react'
import { SignupForm } from '../../signups/SignupForm'
import { SignupList } from '../../signups/SignupList'
import { t, formatMegSentMessage, type Lang } from '../../../lib/i18n'
import { useLocalStorageState } from '../../../app/hooks/useLocalStorageState'
import { loadPlayerName, loadPokeSeenAt, pokeSeenAtKey, savePlayerName, savePokeSeenAt } from '../../../lib/storage'
import { clearDeleteToken, loadDeleteToken, newUuid, saveDeleteToken } from '../../../lib/tokens'
import { supabase } from '../../../lib/supabase'
import { toAppError } from '../../../api/errors'
import { fireConfetti } from '../../../app/hooks/useConfettiOnNewSignups'
import { todayLocalISODate } from '../../../lib/date'
import {
  useRosterQuery,
  useCreateSignupMutation,
  useUnregisterSignupMutation,
  usePlayerAuraQuery,
  usePlayerDistinctGameCountsQuery,
  usePlayerWeeklyStreaksQuery,
} from '../queries'
import { isNewPlayerDistinctDays } from '../newPlayer'
import { useMyPokesQuery, useSendPokeMutation, useUpdateMyEmojiMutation } from '../funQueries'
import { useActiveLocationQuery, useGameStatusQuery, useMinPlayersQuery } from '../../settings/queries'
import type { LocationId } from '../../signups/types'
import { GameStatusCard } from './GameStatusCard'
import { ShareFacebookPostCard } from '../../shell/components/ShareFacebookPostCard'
import { EmojiPickerModal } from './EmojiPickerModal'
import { PokeBannerCard } from './PokeBannerCard'
import type { GameStatus } from '../../../api/settings'

const QUICK_JOIN_EVENT = 'jeffpickup:quickJoin'
const QUICK_JOIN_SUCCESS_EVENT = 'jeffpickup:quickJoinSuccess'
const JOINED_STATE_EVENT = 'jeffpickup:joinedState'

export function SignupSection(props: {
  lang: Lang
  playDate: string
  facebookGroupUrl: string
  registerUrl: string
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

  const rosterNameKeys = useMemo(
    () =>
      [...new Set((rosterQuery.data ?? []).map((s) => s.player_name.trim().toLowerCase()).filter(Boolean))],
    [rosterQuery.data],
  )
  const gameCountsQuery = usePlayerDistinctGameCountsQuery(rosterNameKeys)
  const playerAuraQuery = usePlayerAuraQuery(rosterNameKeys)
  const streaksQuery = usePlayerWeeklyStreaksQuery({ nameKeys: rosterNameKeys, asOf: props.playDate })
  const newPlayerNameKeys = useMemo(() => {
    if (!gameCountsQuery.data || gameCountsQuery.isError) return new Set<string>()
    const out = new Set<string>()
    for (const k of rosterNameKeys) {
      const c = gameCountsQuery.data[k] ?? 0
      if (isNewPlayerDistinctDays(c)) out.add(k)
    }
    return out
  }, [gameCountsQuery.data, gameCountsQuery.isError, rosterNameKeys])
  const viewerIsNew = useMemo(() => {
    const myKey = cleanedName.trim().toLowerCase()
    if (!myKey) return false
    return newPlayerNameKeys.has(myKey)
  }, [cleanedName, newPlayerNameKeys])

  useEffect(() => {
    if (!rosterQuery.data) return
    if (rosterQuery.isError) setError(t(props.lang, 'couldNotLoad'))
  }, [props.lang, rosterQuery.data, rosterQuery.isError])

  const activeLocationQuery = useActiveLocationQuery()
  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'

  const createSignupMutation = useCreateSignupMutation({ playDate: props.playDate })
  const unregisterSignupMutation = useUnregisterSignupMutation({ playDate: props.playDate })
  const updateEmojiMutation = useUpdateMyEmojiMutation({ playDate: props.playDate })
  const sendPokeMutation = useSendPokeMutation({
    playDate: props.playDate,
    clientToday: todayLocalISODate(),
  })

  const submitting =
    createSignupMutation.isPending ||
    unregisterSignupMutation.isPending ||
    updateEmojiMutation.isPending ||
    sendPokeMutation.isPending
  const disabled = !supabase
  const isPastSession = props.playDate < todayLocalISODate()

  const mySignup = useMemo(() => {
    const n = cleanedName.toLowerCase()
    if (!n) return null
    return signups.find((s) => s.player_name.trim().toLowerCase() === n) ?? null
  }, [cleanedName, signups])

  const [myDeleteToken, setMyDeleteToken] = useState('')
  useEffect(() => {
    if (!cleanedName) {
      setMyDeleteToken('')
      return
    }
    setMyDeleteToken(loadDeleteToken({ playDate: props.playDate, playerName: cleanedName }))
  }, [cleanedName, props.playDate])

  const joined = Boolean(mySignup)
  const canUnregister = Boolean(mySignup && myDeleteToken)

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(JOINED_STATE_EVENT, { detail: { playDate: props.playDate, joined } }),
    )
  }, [joined, props.playDate])

  const joinWithGuests = async (guestsParsed: number) => {
    if (!supabase) return
    if (mySignup) return
    if (isPastSession) {
      setError(t(props.lang, 'registrationClosedPastSession'))
      return
    }
    if (!cleanedName) {
      setError(t(props.lang, 'enterName'))
      return
    }
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
      window.dispatchEvent(
        new CustomEvent(QUICK_JOIN_SUCCESS_EVENT, { detail: { playDate: props.playDate } }),
      )
      saveDeleteToken({
        playDate: props.playDate,
        playerName: cleanedName,
        deleteToken,
      })
      setMyDeleteToken(deleteToken)
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
  }

  useEffect(() => {
    const onQuickJoin = (e: Event) => {
      const detail = (e as CustomEvent).detail as { playDate?: string } | undefined
      if (detail?.playDate && detail.playDate !== props.playDate) return
      if (isPastSession) return
      if (submitting || disabled || joined) return
      void joinWithGuests(0)
    }

    window.addEventListener(QUICK_JOIN_EVENT, onQuickJoin)
    return () => window.removeEventListener(QUICK_JOIN_EVENT, onQuickJoin)
  }, [disabled, isPastSession, joined, props.playDate, submitting])

  const gameStatusQuery = useGameStatusQuery()
  const minPlayersQuery = useMinPlayersQuery()

  const rosterGoal = minPlayersQuery.data ?? 10
  const rosterHeadcount = useMemo(() => {
    return signups.reduce((sum, s) => sum + 1 + Math.max(0, s.guest_count ?? 0), 0)
  }, [signups])
  const effectiveGameStatus: GameStatus = useMemo(() => {
    const raw = gameStatusQuery.data ?? 'tentative'
    if (raw !== 'tentative') return raw
    return rosterHeadcount >= rosterGoal ? 'on' : 'tentative'
  }, [gameStatusQuery.data, rosterGoal, rosterHeadcount])

  const pokesQuery = useMyPokesQuery({
    playDate: props.playDate,
    signupId: mySignup?.id,
    deleteToken: myDeleteToken || undefined,
    refetchIntervalMs: 12_000,
  })
  const [pokedToToday, setPokedToToday] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setPokedToToday(new Set())
  }, [props.playDate])

  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiDraft, setEmojiDraft] = useState('')
  const [pokeBanner, setPokeBanner] = useState<{
    from: string
    at: string
    kind: 'poke' | 'wave'
    megValue?: number | null
  } | null>(null)
  const [pokeSeenInitialized, setPokeSeenInitialized] = useState(false)

  useEffect(() => {
    if (isPastSession) {
      setEmojiOpen(false)
      setPokeBanner(null)
    }
  }, [isPastSession])

  useEffect(() => {
    if (!joined) {
      setPokeBanner(null)
      setPokeSeenInitialized(false)
      return
    }
    if (!mySignup?.id || !myDeleteToken) return
    if (!pokesQuery.data) return

    const key = pokeSeenAtKey({ playDate: props.playDate, signupId: mySignup.id })
    const latest = pokesQuery.data[0]

    if (!pokeSeenInitialized) {
      const existing = loadPokeSeenAt(key)
      const baseline = existing ?? latest?.created_at ?? new Date(0).toISOString()
      savePokeSeenAt(key, baseline)
      setPokeSeenInitialized(true)
      return
    }

    if (!latest) return

    const seen = loadPokeSeenAt(key)
    if (!seen) return

    if (new Date(latest.created_at) > new Date(seen)) {
      const k = (latest as any).kind
      const megValue = (latest as any).meg_value
      const kind: 'poke' | 'wave' = k === 'wave' ? 'wave' : 'poke'
      const parsedMegValue =
        typeof megValue === 'number' && Number.isFinite(megValue) ? megValue : null
      setPokeBanner({
        from: latest.from_player_name,
        at: latest.created_at,
        kind,
        megValue: kind === 'poke' ? parsedMegValue : null,
      })
    }
  }, [
    cleanedName,
    joined,
    myDeleteToken,
    mySignup?.id,
    newPlayerNameKeys,
    pokesQuery.data,
    pokeSeenInitialized,
    props.playDate,
    viewerIsNew,
  ])

  return (
    <>
      <div id="signup" />
      <GameStatusCard
        lang={props.lang}
        status={gameStatusQuery.data ?? 'tentative'}
        headcount={rosterHeadcount}
        minPlayers={rosterGoal}
        onTapTitle={props.onTapAdminTitle}
      />

      {error ? (
        <section className="rounded-2xl border border-red-200/30 bg-red-500/10 p-4 text-sm text-red-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">{error}</div>
            <button
              type="button"
              className="shrink-0 rounded-xl border border-red-200/30 bg-black/20 px-3 py-2 text-xs font-semibold text-red-100/90 hover:bg-white/10"
              onClick={() => setError(null)}
            >
              {t(props.lang, 'close')}
            </button>
          </div>
        </section>
      ) : null}

      {!isPastSession && !joined ? (
        <SignupForm
          labels={{
            joinTheList: t(props.lang, 'joinTheList'),
            yourName: t(props.lang, 'yourName'),
            namePlaceholder: t(props.lang, 'namePlaceholder'),
            enterName: t(props.lang, 'enterName'),
            keepUnder40: t(props.lang, 'keepUnder40'),
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
            const rawGuests = guestCount.trim()
            const guestsParsed = rawGuests ? Number.parseInt(rawGuests, 10) : 0
            await joinWithGuests(guestsParsed)
          }}
        />
      ) : null}

      {!isPastSession && pokeBanner ? (
        <PokeBannerCard
          lang={props.lang}
          kind={pokeBanner.kind}
          from={pokeBanner.from}
          megValue={pokeBanner.megValue}
          onDismiss={() => {
            if (!mySignup?.id) return
            const key = pokeSeenAtKey({ playDate: props.playDate, signupId: mySignup.id })
            savePokeSeenAt(key, pokeBanner.at)
            setPokeBanner(null)
          }}
        />
      ) : null}

      <SignupList
        labels={{
          players: t(props.lang, 'players'),
          registered: t(props.lang, 'registered'),
          loading: t(props.lang, 'loading'),
          emptyList: t(props.lang, 'emptyList'),
          unregister: t(props.lang, 'unregister'),
          unregisterHint: t(props.lang, 'unregisterHint'),
          goal: t(props.lang, 'goal'),
          walkOnsHint: t(props.lang, 'walkOnsHint'),
          guestsTag: t(props.lang, 'guestsTag'),
          emoji: t(props.lang, 'emoji'),
          poke: t(props.lang, 'poke'),
          wave: t(props.lang, 'wave'),
          newPlayerBadge: t(props.lang, 'newPlayerBadge'),
          newPlayerBadgeTitle: t(props.lang, 'newPlayerBadgeTitle'),
          streakLabel: t(props.lang, 'streakLabel'),
          streakTitle: t(props.lang, 'streakTitle'),
          milestoneTitle: t(props.lang, 'milestoneTitle'),
          auraShort: t(props.lang, 'auraShort'),
            oneMegPerDay: t(props.lang, 'oneMegPerDay'),
        }}
        signups={signups}
        auraByNameKey={playerAuraQuery.data}
        disabledPokeToSignupIds={pokedToToday}
        newPlayerNameKeys={newPlayerNameKeys}
        viewerIsNew={viewerIsNew}
        loading={loading}
        goal={effectiveGameStatus === 'on' ? undefined : rosterGoal}
        mySignupId={mySignup?.id}
        myDeleteToken={!isPastSession ? (myDeleteToken || undefined) : undefined}
        gameCountsByNameKey={gameCountsQuery.data}
        weeklyStreaksByNameKey={streaksQuery.data}
        canUnregister={!isPastSession ? canUnregister : false}
        onPressEmoji={
          !isPastSession && mySignup && myDeleteToken
            ? () => {
                setEmojiDraft((mySignup.emoji ?? '').trim())
                setEmojiOpen(true)
              }
            : undefined
        }
        onPoke={
          !isPastSession && mySignup && myDeleteToken
            ? async (_toId, toName, kind) => {
                const confirmMsg = kind === 'wave'
                  ? t(props.lang, 'waveConfirm').replace('{name}', toName)
                  : t(props.lang, 'pokeConfirm').replace('{name}', toName)
                const ok = window.confirm(confirmMsg)
                if (!ok) return
                try {
                  if (isPastSession) return
                  const res = await sendPokeMutation.mutateAsync({
                    fromSignupId: mySignup.id,
                    deleteToken: myDeleteToken,
                    toSignupId: _toId,
                    actionKind: kind === 'wave' ? 'wave' : 'poke',
                  })
                  setPokedToToday((prev) => {
                    const next = new Set(prev)
                    next.add(_toId)
                    return next
                  })
                  if (res.kind === 'wave') {
                    window.alert(t(props.lang, 'waveSentWithAura'))
                  } else if (res.megValue != null) {
                    window.alert(formatMegSentMessage(props.lang, res.megValue))
                  } else {
                    window.alert(t(props.lang, 'pokeSent'))
                  }
                } catch (e: unknown) {
                  const err = toAppError(e)
                  if (err.message.includes('Already poked this player today')) {
                    setPokedToToday((prev) => {
                      const next = new Set(prev)
                      next.add(_toId)
                      return next
                    })
                    setError(t(props.lang, 'oneMegPerDay'))
                    return
                  }
                  setError(
                    err.message
                      ? err.message
                      : kind === 'wave'
                        ? t(props.lang, 'couldNotWave')
                        : t(props.lang, 'couldNotPoke'),
                  )
                }
              }
            : undefined
        }
        onUnregister={
          !isPastSession && mySignup && myDeleteToken
            ? async () => {
                setError(null)
                try {
                  if (isPastSession) return
                  await unregisterSignupMutation.mutateAsync({
                    signupId: mySignup.id,
                    deleteToken: myDeleteToken,
                  })
                  clearDeleteToken({ playDate: props.playDate, playerName: cleanedName })
                  setMyDeleteToken('')
                } catch {
                  setError(t(props.lang, 'couldNotRemove'))
                }
              }
            : undefined
        }
      />

      <ShareFacebookPostCard
        lang={props.lang}
        playDate={props.playDate}
        facebookGroupUrl={props.facebookGroupUrl}
        registerUrl={props.registerUrl}
      />

      <EmojiPickerModal
        lang={props.lang}
        open={!isPastSession && emojiOpen && Boolean(mySignup && myDeleteToken)}
        value={emojiDraft}
        saving={updateEmojiMutation.isPending}
        onClose={() => setEmojiOpen(false)}
        onChange={setEmojiDraft}
        onSave={async () => {
          if (isPastSession) return
          if (!mySignup || !myDeleteToken) return
          try {
            await updateEmojiMutation.mutateAsync({
              signupId: mySignup.id,
              deleteToken: myDeleteToken,
              emoji: emojiDraft,
            })
            setEmojiOpen(false)
          } catch {
            setError(t(props.lang, 'couldNotAdd'))
          }
        }}
      />
    </>
  )
}

