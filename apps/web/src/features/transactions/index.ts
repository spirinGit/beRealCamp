import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Transaction {
  id: string
  campId: string
  childId: string
  actorUserId: string | null
  type: 'earn' | 'spend'
  amount: number
  reason: string
  comment: string | null
  createdAt: string
}

export interface CoinRule {
  id: string
  key: string
  label: string
  points: number
  isActive: boolean
}

export function useCoinRules() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['coin-rules', user?.campId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${user?.campId}`)
      return data.filter((r) => r.isActive && r.points > 0)
    },
    enabled: !!user?.campId,
  })
}

export function usePenaltyRules() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['penalty-rules', user?.campId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${user?.campId}`)
      return data.filter((r) => r.isActive && r.points < 0)
    },
    enabled: !!user?.campId,
  })
}

export function useTransactions(childId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['transactions', user?.campId, childId],
    queryFn: async () => {
      const params = new URLSearchParams({ campId: user!.campId })
      if (childId) params.set('childId', childId)
      const { data } = await apiClient.get<Transaction[]>(`/transactions?${params}`)
      return data
    },
    enabled: !!user?.campId,
  })
}

export function useSpendTalents() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childId: string
      amount: number
      reason: string
      comment?: string
    }) => {
      const { data } = await apiClient.post('/transactions/spend', {
        ...body,
        campId: user!.campId,
      })
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['balance', vars.childId] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useSearchChildren(q: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['children-search', q],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        id: string; firstName: string; lastName: string
        squadId: string; campId: string; photoUrl: string | null; dateOfBirth: string
      }[]>(`/children/search?q=${encodeURIComponent(q)}&campId=${user?.campId}`)
      return data
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}

export function useEarnTalents() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childId: string
      amount: number
      reason: string
      comment?: string
    }) => {
      const { data } = await apiClient.post('/transactions/earn', {
        ...body,
        campId: user!.campId,
      })
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['balance', vars.childId] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useBulkEarnTalents() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childIds: string[]
      amount: number
      reason: string
      comment?: string
    }) => {
      const requests = body.childIds.map((childId) =>
        apiClient.post('/transactions/earn', {
          campId: user!.campId,
          childId,
          amount: body.amount,
          reason: body.reason,
          comment: body.comment,
        }),
      )
      await Promise.all(requests)
      return { count: body.childIds.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useBulkSpendTalents() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childIds: string[]
      amount: number
      reason: string
      comment?: string
    }) => {
      const requests = body.childIds.map((childId) =>
        apiClient.post('/transactions/spend', {
          campId: user!.campId,
          childId,
          amount: body.amount,
          reason: body.reason,
          comment: body.comment,
        }),
      )
      await Promise.all(requests)
      return { count: body.childIds.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
