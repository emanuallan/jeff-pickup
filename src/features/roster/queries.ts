import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchCapsLeaderboard,
  fetchPlayerDistinctGameCounts,
  fetchPlayerWeeklyStreaks,
  fetchWeeklyStreakLeaderboard,
} from '../../api/playerStats'
import { fetchPlayerAura } from '../../api/aura'
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

export const playerStreakKeys = {
  all: ['playerWeeklyStreaks'] as const,
  forNameKeys: (sortedKeysJoined: string, asOf: string) => [...playerStreakKeys.all, sortedKeysJoined, asOf] as const,
}

export const capsLeaderboardKeys = {
  all: ['capsLeaderboard'] as const,
}

export const weeklyStreakLeaderboardKeys = {
  all: ['weeklyStreakLeaderboard'] as const,
}

export const playerAuraKeys = {
  all: ['playerAura'] as const,
  forNameKeys: (sortedKeysJoined: string) => [...playerAuraKeys.all, sortedKeysJoined] as const,
}

function stableNameKeys(nameKeys: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of nameKeys) {
    const k = raw.trim()
    if (!k) continue
    if (seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  out.sort()
  return out
}

function stableNameKeyString(nameKeys: string[]) {
  return stableNameKeys(nameKeys).join('\u0001')
}

export function useRosterQuery(args: { playDate: string; refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: rosterKeys.byDate({ playDate: args.playDate }),
    queryFn: () => fetchSignups({ playDate: args.playDate }),
    refetchInterval: args.refetchIntervalMs ?? 30_000,
  })
}

export function usePlayerDistinctGameCountsQuery(nameKeys: string[]) {
  const sortedKey = useMemo(() => stableNameKeyString(nameKeys), [nameKeys])

  return useQuery({
    queryKey: playerStatsKeys.forNameKeys(sortedKey),
    queryFn: () => fetchPlayerDistinctGameCounts(nameKeys),
    enabled: Boolean(supabase) && nameKeys.length > 0,
    staleTime: 30_000,
  })
}

export function usePlayerWeeklyStreaksQuery(args: { nameKeys: string[]; asOf: string }) {
  const sortedKey = useMemo(() => stableNameKeyString(args.nameKeys), [args.nameKeys])

  const asOf = args.asOf.slice(0, 10)
  return useQuery({
    queryKey: playerStreakKeys.forNameKeys(sortedKey, asOf),
    queryFn: () => fetchPlayerWeeklyStreaks({ nameKeys: args.nameKeys, asOf }),
    enabled: Boolean(supabase) && args.nameKeys.length > 0,
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

export function useWeeklyStreakLeaderboardQuery() {
  const asOf = todayLocalISODate()
  return useQuery({
    queryKey: [...weeklyStreakLeaderboardKeys.all, asOf] as const,
    queryFn: () => fetchWeeklyStreakLeaderboard({ limit: 200, asOf }),
    enabled: Boolean(supabase),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePlayerAuraQuery(nameKeys: string[]) {
  const sortedKey = useMemo(() => stableNameKeyString(nameKeys), [nameKeys])
  return useQuery({
    queryKey: playerAuraKeys.forNameKeys(sortedKey),
    queryFn: () => fetchPlayerAura(nameKeys),
    enabled: Boolean(supabase) && nameKeys.length > 0,
    staleTime: 10_000,
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
      await qc.invalidateQueries({ queryKey: playerStreakKeys.all })
      await qc.invalidateQueries({ queryKey: capsLeaderboardKeys.all })
      await qc.invalidateQueries({ queryKey: weeklyStreakLeaderboardKeys.all })
      await qc.invalidateQueries({ queryKey: playerAuraKeys.all })
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
      await qc.invalidateQueries({ queryKey: playerStreakKeys.all })
      await qc.invalidateQueries({ queryKey: capsLeaderboardKeys.all })
      await qc.invalidateQueries({ queryKey: weeklyStreakLeaderboardKeys.all })
      await qc.invalidateQueries({ queryKey: playerAuraKeys.all })
    },
  })
}

