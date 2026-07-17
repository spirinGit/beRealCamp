import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface Squad {
  id: string
  campId: string
  name: string
  color: string
  description: string | null
  photoUrl: string | null
  createdAt: string
}

export interface SquadLeader {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function useSquads() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['squads', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<Squad[]>(`/squads?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
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
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; color: string; description?: string }) => {
      const { data } = await apiClient.post<Squad>('/squads', {
        ...body,
        campId: effectiveCampId!,
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

export function useRenameSquad(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.patch<Squad>(`/squads/${squadId}`, { name })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['squads'] })
    },
  })
}

export interface SquadAvatarUploadTarget {
  uploadUrl: string
  photoUrl: string
  objectKey: string
  expiresInSeconds: number
  allowedContentTypes: string[]
}

export function useUpdateSquad(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name?: string; color?: string; description?: string; photoUrl?: string }) => {
      const { data } = await apiClient.patch<Squad>(`/squads/${squadId}`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squads'] }),
  })
}

export function useCreateSquadAvatarUploadUrl() {
  return useMutation({
    mutationFn: async (body: { contentType: string }) => {
      const { data } = await apiClient.post<SquadAvatarUploadTarget>('/squads/avatar-upload-url', body)
      return data
    },
  })
}

