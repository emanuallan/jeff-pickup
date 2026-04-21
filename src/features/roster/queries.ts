import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSignup, fetchSignups, unregisterSignup } from '../../api/signups'
import type { LocationId } from '../signups/types'

export const rosterKeys = {
  all: ['roster'] as const,
  byDate: (args: { playDate: string }) => [...rosterKeys.all, args] as const,
}

export function useRosterQuery(args: { playDate: string; refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: rosterKeys.byDate({ playDate: args.playDate }),
    queryFn: () => fetchSignups({ playDate: args.playDate }),
    refetchInterval: args.refetchIntervalMs ?? 30_000,
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
    },
  })
}

export function useUnregisterSignupMutation(args: { playDate: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { signupId: string; deleteToken: string }) => unregisterSignup(vars),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: rosterKeys.byDate({ playDate: args.playDate }) })
    },
  })
}

