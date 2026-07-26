import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface RewardItem {
  id: string
  rewardId: string
  name: string
  price: number
  photoUrl: string | null
  isActive: boolean
}

export interface Reward {
  id: string
  campId: string
  workerId: string | null
  workerIds: string[]
  name: string
  description: string | null
  photoUrl: string | null
  isActive: boolean
  items?: RewardItem[]
}

export function useWorkerRewards() {
  return useQuery({
    queryKey: ['worker-rewards-mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<Reward[]>('/rewards/mine')
      return data
    },
  })
}

export function useRewards() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['rewards', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<Reward[]>(`/rewards?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
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
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = await apiClient.post<Reward>('/rewards', {
        ...body,
        campId: effectiveCampId!,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useAssignWorker(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workerId: string) => {
      const { data } = await apiClient.post<Reward>(`/rewards/${rewardId}/assign`, { workerId })
      return data
    },
    onSuccess: (updatedReward) => {
      qc.setQueryData<Reward>(['reward', rewardId], (old) =>
        old ? { ...old, workerIds: updatedReward.workerIds } : old,
      )
      qc.setQueriesData<Reward[]>({ queryKey: ['rewards'] }, (old) =>
        old?.map((r) => (r.id === rewardId ? { ...r, workerIds: updatedReward.workerIds } : r)),
      )
      qc.invalidateQueries({ queryKey: ['rewards'] })
      qc.invalidateQueries({ queryKey: ['reward', rewardId] })
      qc.invalidateQueries({ queryKey: ['worker-rewards-mine'] })
    },
  })
}

export function useUnassignWorker(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workerId: string) => {
      const { data } = await apiClient.delete<Reward>(`/rewards/${rewardId}/workers/${workerId}`)
      return data
    },
    onSuccess: (updatedReward) => {
      qc.setQueryData<Reward>(['reward', rewardId], (old) =>
        old ? { ...old, workerIds: updatedReward.workerIds } : old,
      )
      qc.setQueriesData<Reward[]>({ queryKey: ['rewards'] }, (old) =>
        old?.map((r) => (r.id === rewardId ? { ...r, workerIds: updatedReward.workerIds } : r)),
      )
      qc.invalidateQueries({ queryKey: ['rewards'] })
      qc.invalidateQueries({ queryKey: ['reward', rewardId] })
      qc.invalidateQueries({ queryKey: ['worker-rewards-mine'] })
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

export interface RewardAvatarUploadTarget {
  uploadUrl: string
  photoUrl: string
  objectKey: string
  expiresInSeconds: number
  allowedContentTypes: string[]
}

export function useUpdateReward(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name?: string; description?: string; photoUrl?: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch<Reward>(`/rewards/${rewardId}`, body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] })
      qc.invalidateQueries({ queryKey: ['reward', rewardId] })
    },
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rewardId: string) => {
      await apiClient.delete(`/rewards/${rewardId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useCreateRewardAvatarUploadUrl() {
  return useMutation({
    mutationFn: async (body: { contentType: string }) => {
      const { data } = await apiClient.post<RewardAvatarUploadTarget>('/rewards/avatar-upload-url', body)
      return data
    },
  })
}

export function useCreateRewardItemAvatarUploadUrl() {
  return useMutation({
    mutationFn: async (body: { contentType: string }) => {
      const { data } = await apiClient.post<RewardAvatarUploadTarget>('/rewards/items/avatar-upload-url', body)
      return data
    },
  })
}

export function useUpdateRewardItem(rewardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, ...body }: { itemId: string; name?: string; price?: number; photoUrl?: string; isActive?: boolean }) => {
      await apiClient.patch(`/rewards/${rewardId}/items/${itemId}`, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reward', rewardId] }),
  })
}
