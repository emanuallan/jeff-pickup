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
import {
  useRosterQuery,
  useCreateSignupMutation,
  useUnregisterSignupMutation,
  usePlayerDistinctGameCountsQuery,
} from '../queries'
import { isNewPlayerDistinctDays } from '../newPlayer'
import { useMyPokesQuery, useSendPokeMutation, useUpdateMyEmojiMutation } from '../funQueries'
import { useActiveLocationQuery, useGameStatusQuery, useMinPlayersQuery } from '../../settings/queries'
import type { LocationId } from '../../signups/types'
import { GameStatusCard } from './GameStatusCard'
import { CapsLeaderboard } from './CapsLeaderboard'

const EMOJI_CHOICES = ['⚽️', '🥅', '👟', '🔥', '💪', '😤', '🧤', '⭐️', '🎯', '🏃', '🦁', '🦅', '🧃', '☀️', '🌧️']

function pokeSeenKey(args: { playDate: string; signupId: string }) {
  return `jeffpickup.pokeSeenAt:${args.playDate}:${args.signupId}`
}

function loadPokeSeenAt(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    return v && v.trim() ? v : null
  } catch {
    return null
  }
}

function savePokeSeenAt(key: string, iso: string) {
  try {
    localStorage.setItem(key, iso)
  } catch {
    // ignore
  }
}

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

  const rosterNameKeys = useMemo(
    () =>
      [...new Set((rosterQuery.data ?? []).map((s) => s.player_name.trim().toLowerCase()).filter(Boolean))],
    [rosterQuery.data],
  )
  const gameCountsQuery = usePlayerDistinctGameCountsQuery(rosterNameKeys)
  const newPlayerNameKeys = useMemo(() => {
    if (!gameCountsQuery.data || gameCountsQuery.isError) return new Set<string>()
    const out = new Set<string>()
    for (const k of rosterNameKeys) {
      const c = gameCountsQuery.data[k] ?? 0
      if (isNewPlayerDistinctDays(c)) out.add(k)
    }
    return out
  }, [gameCountsQuery.data, gameCountsQuery.isError, rosterNameKeys])

  useEffect(() => {
    if (!rosterQuery.data) return
    if (rosterQuery.isError) setError(t(props.lang, 'couldNotLoad'))
  }, [props.lang, rosterQuery.data, rosterQuery.isError])

  const activeLocationQuery = useActiveLocationQuery()
  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'

  const createSignupMutation = useCreateSignupMutation({ playDate: props.playDate })
  const unregisterSignupMutation = useUnregisterSignupMutation({ playDate: props.playDate })
  const updateEmojiMutation = useUpdateMyEmojiMutation({ playDate: props.playDate })
  const sendPokeMutation = useSendPokeMutation({ playDate: props.playDate })

  const submitting =
    createSignupMutation.isPending ||
    unregisterSignupMutation.isPending ||
    updateEmojiMutation.isPending ||
    sendPokeMutation.isPending
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

  const pokesQuery = useMyPokesQuery({
    playDate: props.playDate,
    signupId: mySignup?.id,
    deleteToken: myDeleteToken || undefined,
    refetchIntervalMs: 12_000,
  })

  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiDraft, setEmojiDraft] = useState('')
  const [pokeBanner, setPokeBanner] = useState<{ from: string; at: string } | null>(null)
  const [pokeSeenInitialized, setPokeSeenInitialized] = useState(false)
  const [rosterTab, setRosterTab] = useState<'today' | 'caps'>('today')

  useEffect(() => {
    if (!joined) {
      setPokeBanner(null)
      setPokeSeenInitialized(false)
      return
    }
    if (!mySignup?.id || !myDeleteToken) return
    if (!pokesQuery.data) return

    const key = pokeSeenKey({ playDate: props.playDate, signupId: mySignup.id })
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
      setPokeBanner({ from: latest.from_player_name, at: latest.created_at })
    }
  }, [joined, myDeleteToken, mySignup?.id, pokesQuery.data, pokeSeenInitialized, props.playDate])

  const myNameKey = cleanedName.trim().toLowerCase()

  return (
    <>
      {supabase ? (
        <div
          className="mb-3 flex gap-1 rounded-2xl border border-[var(--border)] bg-black/25 p-1"
          role="tablist"
          aria-label={t(props.lang, 'rosterTabs')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={rosterTab === 'today'}
            className={
              rosterTab === 'today'
                ? 'flex-1 rounded-xl bg-[var(--gold)]/20 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-[var(--gold)]/35'
                : 'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white'
            }
            onClick={() => setRosterTab('today')}
          >
            {t(props.lang, 'tabTodaysList')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rosterTab === 'caps'}
            className={
              rosterTab === 'caps'
                ? 'flex-1 rounded-xl bg-[var(--gold)]/20 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-[var(--gold)]/35'
                : 'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white'
            }
            onClick={() => setRosterTab('caps')}
          >
            {t(props.lang, 'tabCapsLeaderboard')}
          </button>
        </div>
      ) : null}

      <GameStatusCard
        lang={props.lang}
        status={gameStatusQuery.data ?? 'tentative'}
        headcount={rosterHeadcount}
        minPlayers={rosterGoal}
        onTapTitle={props.onTapAdminTitle}
      />

      {rosterTab === 'caps' ? (
        <CapsLeaderboard lang={props.lang} myNameKey={myNameKey} />
      ) : null}

      {rosterTab === 'today' ? (
        <>
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

      {pokeBanner ? (
        <section className="rounded-2xl border border-fuchsia-400/55 bg-fuchsia-500/10 p-4 shadow-[0_0_0_1px_rgba(244,114,182,0.22),0_0_28px_rgba(244,114,182,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm font-semibold text-fuchsia-100 drop-shadow-[0_0_10px_rgba(244,114,182,0.55)]">
              {t(props.lang, 'pokeReceived').replace('{name}', pokeBanner.from)}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl border border-fuchsia-400/35 bg-black/25 px-3 py-2 text-xs font-medium text-fuchsia-50 hover:bg-fuchsia-500/10"
              onClick={() => {
                if (!mySignup?.id) return
                const key = pokeSeenKey({ playDate: props.playDate, signupId: mySignup.id })
                savePokeSeenAt(key, pokeBanner.at)
                setPokeBanner(null)
              }}
            >
              {t(props.lang, 'pokeDismiss')}
            </button>
          </div>
        </section>
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
          emoji: t(props.lang, 'emoji'),
          poke: t(props.lang, 'poke'),
          newPlayerBadge: t(props.lang, 'newPlayerBadge'),
          newPlayerBadgeTitle: t(props.lang, 'newPlayerBadgeTitle'),
        }}
        signups={signups}
        newPlayerNameKeys={newPlayerNameKeys}
        loading={loading}
        goal={rosterGoal}
        mySignupId={mySignup?.id}
        myDeleteToken={myDeleteToken || undefined}
        canUnregister={canUnregister}
        onPressEmoji={
          mySignup && myDeleteToken
            ? () => {
                setEmojiDraft((mySignup.emoji ?? '').trim())
                setEmojiOpen(true)
              }
            : undefined
        }
        onPoke={
          mySignup && myDeleteToken
            ? async (_toId, toName) => {
                const ok = window.confirm(t(props.lang, 'pokeConfirm').replace('{name}', toName))
                if (!ok) return
                try {
                  await sendPokeMutation.mutateAsync({
                    fromSignupId: mySignup.id,
                    deleteToken: myDeleteToken,
                    toSignupId: _toId,
                  })
                  window.alert(t(props.lang, 'pokeSent'))
                } catch {
                  setError(t(props.lang, 'couldNotPoke'))
                }
              }
            : undefined
        }
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
      ) : null}

      {emojiOpen && mySignup && myDeleteToken ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEmojiOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[#0b0b0e] p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold">{t(props.lang, 'pickEmoji')}</div>
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
                onClick={() => setEmojiOpen(false)}
              >
                {t(props.lang, 'close')}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={emojiDraft === e}
                  className={
                    emojiDraft === e
                      ? 'rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-2 py-3 text-xl shadow-[0_0_0_1px_rgba(255,255,255,0.10)] ring-1 ring-white/15'
                      : 'rounded-2xl border border-[var(--border)] bg-black/20 px-2 py-3 text-xl hover:bg-white/10'
                  }
                  onClick={() => setEmojiDraft(e)}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                onClick={() => setEmojiDraft('')}
              >
                {t(props.lang, 'removeEmoji')}
              </button>
              <button
                type="button"
                disabled={updateEmojiMutation.isPending}
                className="rounded-2xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-[var(--gold-2)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80"
                onClick={async () => {
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
              >
                {t(props.lang, 'saveEmoji')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

