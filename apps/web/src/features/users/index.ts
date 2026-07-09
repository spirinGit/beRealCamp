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
  const { user } = useAuth()
  return useQuery({
    queryKey: ['users', user?.campId],
    queryFn: async () => {
      const { data } = await apiClient.get<User[]>(`/users?campId=${user?.campId}`)
      return data
    },
    enabled: !!user?.campId,
  })
}

export function useCreateUser() {
  const { user } = useAuth()
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
        campId: user!.campId,
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

