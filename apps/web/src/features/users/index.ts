import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface User {
  id: string
  campId: string
  firstName: string
  lastName: string
  email: string
  role: 'Administrator' | 'Leader' | 'Worker'
  isActive: boolean
  photoUrl: string | null
  createdAt: string
}

export const ROLE_LABELS: Record<User['role'], string> = {
  Administrator: 'Адмін',
  Leader: 'Лідер',
  Worker: 'Воркер',
}

export const ROLE_COLORS: Record<User['role'], string> = {
  Administrator: 'bg-violet-100 text-violet-700',
  Leader: 'bg-blue-100 text-blue-700',
  Worker: 'bg-green-100 text-green-700',
}

export function useUsers() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['users', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<User[]>(`/users?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

export function useCreateUser() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      firstName: string
      lastName: string
      email: string
      password: string
      role: User['role']
    }) => {
      const { data } = await apiClient.post<User>('/users', {
        ...body,
        campId: effectiveCampId!,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/users/${id}/deactivate`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export interface UserAvatarUploadTarget {
  uploadUrl: string
  photoUrl: string
  objectKey: string
  expiresInSeconds: number
  allowedContentTypes: string[]
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { firstName?: string; lastName?: string; email?: string; role?: User['role']; photoUrl?: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch<User>(`/users/${userId}`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useCreateUserAvatarUploadUrl() {
  return useMutation({
    mutationFn: async (body: { contentType: string }) => {
      const { data } = await apiClient.post<UserAvatarUploadTarget>('/users/avatar-upload-url', body)
      return data
    },
  })
}
