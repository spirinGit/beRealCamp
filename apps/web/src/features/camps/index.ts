import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../shared/api/client'

export interface Camp {
  id: string
  name: string
  publicAccessCode?: string | null
  childGuidelines?: string | null
  startDate: string
  endDate: string | null
  status: 'active' | 'archived'
  createdAt: string
}

export interface PublicCampSummary {
  id: string
  name: string
  publicAccessCode: string
  childGuidelines: string | null
  startDate: string
  endDate: string | null
  status: 'active' | 'archived'
}

export interface PublicCampSquad {
  id: string
  name: string
  color: string
  description: string | null
  childCount: number
}

export interface PublicCampChild {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  balance: number
}

export interface PublicChildTransaction {
  id: string
  type: string
  amount: number
  reason: string
  createdAt: string
}

export interface PublicShopReward {
  id: string
  name: string
  description: string | null
  items: Array<{ id: string; name: string; price: number }>
}

export interface PublicCampSearchChild extends PublicCampChild {
  squadId: string
  squadName: string
  squadColor: string
}

export function useCamps() {
  return useQuery({
    queryKey: ['camps'],
    queryFn: async () => {
      const { data } = await apiClient.get<Camp[]>('/camps')
      return data
    },
  })
}

export function useCreateCamp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; startDate: string; endDate: string }) => {
      const { data } = await apiClient.post<Camp>('/camps', body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camps'] })
    },
  })
}

export function useUpdateCamp(campId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; startDate: string; endDate: string }) => {
      const { data } = await apiClient.patch<Camp>(`/camps/${campId}`, body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camps'] })
    },
  })
}

export function useUpdateCampChildGuidelines(campId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (childGuidelines: string) => {
      const { data } = await apiClient.patch<Camp>(`/camps/${campId}`, {
        childGuidelines,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camps'] })
    },
  })
}

export function useArchiveCamp(campId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch<Camp>(`/camps/${campId}/archive`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camps'] })
    },
  })
}

export function useEnsurePublicCampLink(campId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ id: string; name: string; publicAccessCode: string }>(
        `/camps/${campId}/public-link`,
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camps'] })
    },
  })
}

export function usePublicCamp(code?: string | null) {
  return useQuery({
    queryKey: ['public-camp', code],
    queryFn: async () => {
      const { data } = await apiClient.get<{ camp: PublicCampSummary; squads: PublicCampSquad[] }>(
        `/camps/public/${code}`,
      )
      return data
    },
    enabled: !!code,
  })
}

export function usePublicSquadChildren(code?: string | null, squadId?: string | null) {
  return useQuery({
    queryKey: ['public-camp', code, 'squad', squadId, 'children'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        camp: PublicCampSummary
        squad: Omit<PublicCampSquad, 'childCount'> | null
        children: PublicCampChild[]
      }>(`/camps/public/${code}/squads/${squadId}/children`)
      return data
    },
    enabled: !!code && !!squadId,
  })
}

export function usePublicChildSearch(code?: string | null, query?: string) {
  const trimmedQuery = query?.trim() ?? ''

  return useQuery({
    queryKey: ['public-camp', code, 'search', trimmedQuery],
    queryFn: async () => {
      const { data } = await apiClient.get<{ camp: PublicCampSummary; children: PublicCampSearchChild[] }>(
        `/camps/public/${code}/children?q=${encodeURIComponent(trimmedQuery)}`,
      )
      return data
    },
    enabled: !!code && trimmedQuery.length >= 2,
  })
}

export function usePublicChildProfile(code?: string | null, childId?: string | null) {
  return useQuery({
    queryKey: ['public-camp', code, 'child', childId],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        camp: PublicCampSummary
        child: PublicCampChild & {
          squadId: string
          squadName: string
          squadColor: string
          campId: string
          transactions: PublicChildTransaction[]
        }
      }>(`/camps/public/${code}/children/${childId}`)
      return data
    },
    enabled: !!code && !!childId,
  })
}

export function usePublicShop(code?: string | null) {
  return useQuery({
    queryKey: ['public-camp', code, 'shop'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ camp: PublicCampSummary; rewards: PublicShopReward[] }>(
        `/camps/public/${code}/shop`,
      )
      return data
    },
    enabled: !!code,
  })
}
