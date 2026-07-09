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
      return data.filter((r) => r.isActive)
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

