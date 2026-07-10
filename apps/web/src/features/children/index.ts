import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Child {
  id: string
  campId: string
  squadId: string
  firstName: string
  lastName: string
  parentName: string | null
  photoUrl: string | null
  dateOfBirth: string
  gender: 'male' | 'female'
  parentPhone: string | null
  medicalNotes: string | null
  createdAt: string
}

export function useChildren(squadId?: string) {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['children', effectiveCampId, squadId],
    queryFn: async () => {
      const params = new URLSearchParams({ campId: effectiveCampId! })
      if (squadId) params.set('squadId', squadId)
      const { data } = await apiClient.get<Child[]>(`/children?${params}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

export function useChildBalance(childId: string) {
  return useQuery({
    queryKey: ['balance', childId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ childId: string; balance: number }>(`/children/${childId}/balance`)
      return data.balance
    },
    enabled: !!childId,
  })
}

export function useCreateChild() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      squadId: string
      firstName: string
      lastName: string
      parentName?: string
      dateOfBirth: string
      gender: 'male' | 'female'
      parentPhone?: string
      medicalNotes?: string
    }) => {
      const { data } = await apiClient.post<Child>('/children', {
        ...body,
        campId: effectiveCampId!,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  })
}

export function useMoveChildToSquad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, squadId }: { childId: string; squadId: string }) => {
      const { data } = await apiClient.patch<Child>(`/children/${childId}/squad`, { squadId })
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['children'] })
      qc.invalidateQueries({ queryKey: ['balance', vars.childId] })
    },
  })
}

export function useDeleteChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (childId: string) => {
      await apiClient.delete(`/children/${childId}`)
    },
    onSuccess: (_, childId) => {
      qc.invalidateQueries({ queryKey: ['children'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.removeQueries({ queryKey: ['balance', childId] })
    },
  })
}
