import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface PromoCodeItem {
  id: string
  code: string
  rewardPoints: number
  activatedByChildId: string | null
  activatedAt: string | null
  createdAt: string
  activatedChildFirstName: string | null
  activatedChildLastName: string | null
}

export function usePromoCodes() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['promo-codes', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<PromoCodeItem[]>(`/promo-codes?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

export function useCreatePromoCode() {
  const qc = useQueryClient()
  const { effectiveCampId } = useAuth()
  return useMutation({
    mutationFn: async (rewardPoints: number) => {
      const { data } = await apiClient.post<PromoCodeItem>('/promo-codes', {
        campId: effectiveCampId,
        rewardPoints,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] })
    },
  })
}