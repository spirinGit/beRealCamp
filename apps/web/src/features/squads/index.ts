import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Squad {
  id: string
  campId: string
  name: string
  color: string
  description: string | null
  createdAt: string
}

export interface SquadLeader {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function useSquads() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['squads', user?.campId],
    queryFn: async () => {
      const { data } = await apiClient.get<Squad[]>(`/squads?campId=${user?.campId}`)
      return data
    },
    enabled: !!user?.campId,
  })
}

export function useSquadLeaders(squadId: string) {
  return useQuery({
    queryKey: ['squad-leaders', squadId],
    queryFn: async () => {
      const { data } = await apiClient.get<SquadLeader[]>(`/squads/${squadId}/leaders`)
      return data
    },
    enabled: !!squadId,
  })
}

export function useCreateSquad() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; color: string; description?: string }) => {
      const { data } = await apiClient.post<Squad>('/squads', {
        ...body,
        campId: user!.campId,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squads'] }),
  })
}

export function useAssignLeader(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (leaderId: string) => {
      await apiClient.post(`/squads/${squadId}/leaders`, { leaderId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squad-leaders', squadId] }),
  })
}

export function useRemoveLeader(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (leaderId: string) => {
      await apiClient.delete(`/squads/${squadId}/leaders/${leaderId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squad-leaders', squadId] }),
  })
}



