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
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface CoinRule {
  id: string
  key: string
  label: string
  description: string | null
  photoUrl: string | null
  isAchievement: boolean
  points: number
  isActive: boolean
}

export interface TransactionRuleMetadata {
  rulePhotoUrl?: string | null
  ruleDescription?: string | null
}

export function useCoinRules() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['coin-rules', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${effectiveCampId}`)
      return data.filter((r) => r.isActive && r.points > 0)
    },
    enabled: !!effectiveCampId,
  })
}

export function usePenaltyRules() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['penalty-rules', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${effectiveCampId}`)
      return data.filter((r) => r.isActive && r.points < 0)
    },
    enabled: !!effectiveCampId,
  })
}

export function useTransactions(childId?: string) {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['transactions', effectiveCampId, childId],
    queryFn: async () => {
      const params = new URLSearchParams({ campId: effectiveCampId! })
      if (childId) params.set('childId', childId)
      const { data } = await apiClient.get<Transaction[]>(`/transactions?${params}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

export function useSpendCoins() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childId: string
      amount: number
      reason: string
      comment?: string
      metadata?: TransactionRuleMetadata
    }) => {
      const { data } = await apiClient.post('/transactions/spend', {
        ...body,
        campId: effectiveCampId!,
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
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['children-search', q],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        id: string; firstName: string; lastName: string
        squadId: string; campId: string; photoUrl: string | null; dateOfBirth: string
      }[]>(`/children/search?q=${encodeURIComponent(q)}&campId=${effectiveCampId}`)
      return data
    },
    enabled: q.trim().length >= 2 && !!effectiveCampId,
    staleTime: 10_000,
  })
}

export function useEarnCoins() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childId: string
      amount: number
      reason: string
      comment?: string
      metadata?: TransactionRuleMetadata
    }) => {
      const { data } = await apiClient.post('/transactions/earn', {
        ...body,
        campId: effectiveCampId!,
      })
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['balance', vars.childId] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useBulkEarnCoins() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childIds: string[]
      amount: number
      reason: string
      comment?: string
      metadata?: TransactionRuleMetadata
    }) => {
      const requests = body.childIds.map((childId) =>
        apiClient.post('/transactions/earn', {
        campId: effectiveCampId!,
          childId,
          amount: body.amount,
          reason: body.reason,
          comment: body.comment,
          metadata: body.metadata,
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

export function useBulkSpendCoins() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      childIds: string[]
      amount: number
      reason: string
      comment?: string
      metadata?: TransactionRuleMetadata
    }) => {
      const requests = body.childIds.map((childId) =>
        apiClient.post('/transactions/spend', {
        campId: effectiveCampId!,
          childId,
          amount: body.amount,
          reason: body.reason,
          comment: body.comment,
          metadata: body.metadata,
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
