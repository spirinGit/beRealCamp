import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Transaction {
  id: string
  campId: string
  childId: string
  actorUserId: string | null
  actorFirstName?: string | null
  actorLastName?: string | null
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

type SingleTransactionBody = {
  childId: string
  amount: number
  reason: string
  comment?: string
  metadata?: TransactionRuleMetadata
  clientRequestId?: string
}

type BulkTransactionBody = {
  childIds: string[]
  amount: number
  reason: string
  comment?: string
  metadata?: TransactionRuleMetadata
  clientRequestId?: string
}

function createRequestId() {
  return crypto.randomUUID()
}

function createSingleFingerprint(type: 'earn' | 'spend', body: SingleTransactionBody) {
  return JSON.stringify({
    type,
    childId: body.childId,
    amount: body.amount,
    reason: body.reason,
    comment: body.comment ?? null,
    metadata: body.metadata ?? null,
  })
}

function createBulkFingerprint(type: 'bulk-earn' | 'bulk-spend', body: BulkTransactionBody) {
  return JSON.stringify({
    type,
    childIds: [...body.childIds].sort(),
    amount: body.amount,
    reason: body.reason,
    comment: body.comment ?? null,
    metadata: body.metadata ?? null,
  })
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
  const inFlight = useRef(new Map<string, Promise<unknown>>())
  const requestIds = useRef(new Map<string, string>())
  return useMutation({
    mutationFn: async (body: SingleTransactionBody) => {
      const fingerprint = createSingleFingerprint('spend', body)
      const existing = inFlight.current.get(fingerprint)
      if (existing) return existing

      const clientRequestId = body.clientRequestId ?? requestIds.current.get(fingerprint) ?? createRequestId()
      requestIds.current.set(fingerprint, clientRequestId)

      const request = apiClient.post('/transactions/spend', {
        ...body,
        campId: effectiveCampId!,
        clientRequestId,
      }).then((response) => response.data)

      inFlight.current.set(fingerprint, request)

      try {
        const result = await request
        requestIds.current.delete(fingerprint)
        return result
      } finally {
        inFlight.current.delete(fingerprint)
      }
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
  const inFlight = useRef(new Map<string, Promise<unknown>>())
  const requestIds = useRef(new Map<string, string>())
  return useMutation({
    mutationFn: async (body: SingleTransactionBody) => {
      const fingerprint = createSingleFingerprint('earn', body)
      const existing = inFlight.current.get(fingerprint)
      if (existing) return existing

      const clientRequestId = body.clientRequestId ?? requestIds.current.get(fingerprint) ?? createRequestId()
      requestIds.current.set(fingerprint, clientRequestId)

      const request = apiClient.post('/transactions/earn', {
        ...body,
        campId: effectiveCampId!,
        clientRequestId,
      }).then((response) => response.data)

      inFlight.current.set(fingerprint, request)

      try {
        const result = await request
        requestIds.current.delete(fingerprint)
        return result
      } finally {
        inFlight.current.delete(fingerprint)
      }
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
  const inFlight = useRef(new Map<string, Promise<unknown>>())
  const requestIds = useRef(new Map<string, string>())
  return useMutation({
    mutationFn: async (body: BulkTransactionBody) => {
      const fingerprint = createBulkFingerprint('bulk-earn', body)
      const existing = inFlight.current.get(fingerprint)
      if (existing) return existing

      const batchRequestId = body.clientRequestId ?? requestIds.current.get(fingerprint) ?? createRequestId()
      requestIds.current.set(fingerprint, batchRequestId)
      const request = Promise.all(
        body.childIds.map((childId) =>
          apiClient.post('/transactions/earn', {
            campId: effectiveCampId!,
            childId,
            amount: body.amount,
            reason: body.reason,
            comment: body.comment,
            metadata: body.metadata,
            clientRequestId: `${batchRequestId}:${childId}`,
          }),
        ),
      ).then(() => ({ count: body.childIds.length }))

      inFlight.current.set(fingerprint, request)

      try {
        const result = await request
        requestIds.current.delete(fingerprint)
        return result
      } finally {
        inFlight.current.delete(fingerprint)
      }
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
  const inFlight = useRef(new Map<string, Promise<unknown>>())
  const requestIds = useRef(new Map<string, string>())
  return useMutation({
    mutationFn: async (body: BulkTransactionBody) => {
      const fingerprint = createBulkFingerprint('bulk-spend', body)
      const existing = inFlight.current.get(fingerprint)
      if (existing) return existing

      const batchRequestId = body.clientRequestId ?? requestIds.current.get(fingerprint) ?? createRequestId()
      requestIds.current.set(fingerprint, batchRequestId)
      const request = Promise.all(
        body.childIds.map((childId) =>
          apiClient.post('/transactions/spend', {
            campId: effectiveCampId!,
            childId,
            amount: body.amount,
            reason: body.reason,
            comment: body.comment,
            metadata: body.metadata,
            clientRequestId: `${batchRequestId}:${childId}`,
          }),
        ),
      ).then(() => ({ count: body.childIds.length }))

      inFlight.current.set(fingerprint, request)

      try {
        const result = await request
        requestIds.current.delete(fingerprint)
        return result
      } finally {
        inFlight.current.delete(fingerprint)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

