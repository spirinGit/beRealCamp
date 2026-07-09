import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface RewardItem {
  id: string
  rewardId: string
  name: string
  price: number
  isActive: boolean
}

export interface Reward {
  id: string
  campId: string
  workerId: string | null
  name: string
  description: string | null
  photoUrl: string | null
  isActive: boolean
  items?: RewardItem[]
}

export function useRewards() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rewards', user?.campId],
    queryFn: async () => {
      const { data } = await apiClient.get<Reward[]>(`/rewards?campId=${user?.campId}`)
      return data
    },
    enabled: !!user?.campId,
  })
}

export function useRewardDetail(id: string) {
  return useQuery({
    queryKey: ['reward', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Reward>(`/rewards/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateReward() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = await apiClient.post<Reward>('/rewards', {
        ...body,
        campId: user!.campId,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useAssignWorker(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workerId: string | null) => {
      const { data } = await apiClient.post(`/rewards/${rewardId}/assign`, { workerId })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] })
      qc.invalidateQueries({ queryKey: ['reward', rewardId] })
    },
  })
}

export function useCreateRewardItem(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; price: number }) => {
      const { data } = await apiClient.post(`/rewards/${rewardId}/items`, body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reward', rewardId] }),
  })
}

export function useToggleRewardItem(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, isActive }: { itemId: string; isActive: boolean }) => {
      await apiClient.patch(`/rewards/${rewardId}/items/${itemId}`, { isActive })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reward', rewardId] }),
  })
}


