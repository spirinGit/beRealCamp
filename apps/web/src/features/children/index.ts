import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Child {
  id: string
  campId: string
  squadId: string
  firstName: string
  lastName: string
  photoUrl: string | null
  dateOfBirth: string
  gender: 'male' | 'female'
  parentPhone: string
  medicalNotes: string | null
  createdAt: string
}

export function useChildren(squadId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['children', user?.campId, squadId],
    queryFn: async () => {
      const params = new URLSearchParams({ campId: user!.campId })
      if (squadId) params.set('squadId', squadId)
      const { data } = await apiClient.get<Child[]>(`/children?${params}`)
      return data
    },
    enabled: !!user?.campId,
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
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      squadId: string
      firstName: string
      lastName: string
      dateOfBirth: string
      gender: 'male' | 'female'
      parentPhone: string
      medicalNotes?: string
    }) => {
      const { data } = await apiClient.post<Child>('/children', {
        ...body,
        campId: user!.campId,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  })
}


