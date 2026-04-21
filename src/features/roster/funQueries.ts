import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyPokes, sendPoke, updateMySignupEmoji } from '../../api/rosterFun'
import { rosterKeys } from './queries'

export const pokeKeys = {
  all: ['pokes'] as const,
  mine: (args: { playDate: string; signupId: string }) => [...pokeKeys.all, args] as const,
}

export function useMyPokesQuery(args: {
  playDate: string
  signupId?: string
  deleteToken?: string
  refetchIntervalMs?: number
}) {
  const enabled = Boolean(args.signupId && args.deleteToken)
  return useQuery({
    queryKey: pokeKeys.mine({ playDate: args.playDate, signupId: args.signupId ?? '' }),
    enabled,
    queryFn: () =>
      fetchMyPokes({
        signupId: String(args.signupId),
        deleteToken: String(args.deleteToken),
      }),
    staleTime: 5_000,
    refetchInterval: args.refetchIntervalMs ?? 12_000,
  })
}

export function useUpdateMyEmojiMutation(args: { playDate: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { signupId: string; deleteToken: string; emoji: string }) =>
      updateMySignupEmoji(vars),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: rosterKeys.byDate({ playDate: args.playDate }) })
    },
  })
}

export function useSendPokeMutation(args: { playDate: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { fromSignupId: string; deleteToken: string; toSignupId: string }) =>
      sendPoke(vars),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: rosterKeys.byDate({ playDate: args.playDate }) })
      await qc.invalidateQueries({
        queryKey: pokeKeys.mine({ playDate: args.playDate, signupId: vars.toSignupId }),
      })
    },
  })
}
