import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchCapsLeaderboard, fetchPlayerDistinctGameCounts } from '../../api/playerStats'
import { createSignup, fetchSignups, unregisterSignup } from '../../api/signups'
import { todayLocalISODate } from '../../lib/date'
import { supabase } from '../../lib/supabase'
import type { LocationId } from '../signups/types'

export const rosterKeys = {
  all: ['roster'] as const,
  byDate: (args: { playDate: string }) => [...rosterKeys.all, args] as const,
}

export const playerStatsKeys = {
  all: ['playerGameCounts'] as const,
  forNameKeys: (sortedKeysJoined: string) => [...playerStatsKeys.all, sortedKeysJoined] as const,
}

export const capsLeaderboardKeys = {
  all: ['capsLeaderboard'] as const,
}

export function useRosterQuery(args: { playDate: string; refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: rosterKeys.byDate({ playDate: args.playDate }),
    queryFn: () => fetchSignups({ playDate: args.playDate }),
    refetchInterval: args.refetchIntervalMs ?? 30_000,
  })
}

export function usePlayerDistinctGameCountsQuery(nameKeys: string[]) {
  const sortedKey = useMemo(() => [...nameKeys].sort().join('\u0001'), [nameKeys.join('\u0001')])

  return useQuery({
    queryKey: playerStatsKeys.forNameKeys(sortedKey),
    queryFn: () => fetchPlayerDistinctGameCounts(nameKeys),
    enabled: Boolean(supabase) && nameKeys.length > 0,
    staleTime: 30_000,
  })
}

export function useCapsLeaderboardQuery() {
  const asOf = todayLocalISODate()
  return useQuery({
    queryKey: [...capsLeaderboardKeys.all, asOf] as const,
    queryFn: () => fetchCapsLeaderboard({ limit: 200, asOf }),
    enabled: Boolean(supabase),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useCreateSignupMutation(args: { playDate: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      playDate: string
      location: LocationId
      playerName: string
      guestCount: number
      deleteToken: string
    }) => createSignup(vars),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: rosterKeys.byDate({ playDate: args.playDate }) })
      await qc.invalidateQueries({ queryKey: playerStatsKeys.all })
      await qc.invalidateQueries({ queryKey: capsLeaderboardKeys.all })
    },
  })
}

export function useUnregisterSignupMutation(args: { playDate: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { signupId: string; deleteToken: string }) => unregisterSignup(vars),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: rosterKeys.byDate({ playDate: args.playDate }) })
      await qc.invalidateQueries({ queryKey: playerStatsKeys.all })
      await qc.invalidateQueries({ queryKey: capsLeaderboardKeys.all })
    },
  })
}

