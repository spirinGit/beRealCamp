import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiClient } from '../../shared/api/client'

export interface CampEvent {
  id: string
  title: string
  description: string | null
  code: string
  rewardPoints: number
  penaltyPoints: number
  endsAt: string
  createdAt: string
}

export interface EventParticipant {
  squadId: string
  squadName: string
  status: 'pending' | 'completed' | 'failed'
  resolvedAt: string | null
  resolutionSource: 'admin' | 'leader_code' | 'timeout' | null
}

export interface EventDetails extends CampEvent {
  participants: EventParticipant[]
}

export interface LeaderEventRow {
  eventId: string
  title: string
  description: string | null
  code: string
  rewardPoints: number
  penaltyPoints: number
  endsAt: string
  squadId: string
  squadName: string
  status: 'pending' | 'completed' | 'failed'
  resolvedAt: string | null
}

export function useAdminEvents(view: 'active' | 'history') {
  return useQuery({
    queryKey: ['events', 'admin', view],
    queryFn: async () => {
      const { data } = await apiClient.get<CampEvent[]>(`/events/admin?view=${view}`)
      return data
    },
  })
}

export function useEventDetails(eventId?: string) {
  return useQuery({
    queryKey: ['events', 'admin', 'details', eventId],
    queryFn: async () => {
      const { data } = await apiClient.get<EventDetails>(`/events/admin/${eventId}`)
      return data
    },
    enabled: !!eventId,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      title: string
      description?: string
      code: string
      rewardPoints: number
      penaltyPoints: number
      endsAt: string
      squadIds: string[]
    }) => {
      const { data } = await apiClient.post('/events/admin', body)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'admin'] })
    },
  })
}

export function useUpdateEventParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { squadId: string; status: 'completed' | 'failed' }) => {
      const { data } = await apiClient.patch(`/events/admin/${eventId}/squads/${body.squadId}`, {
        status: body.status,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'admin'] })
      qc.invalidateQueries({ queryKey: ['events', 'admin', 'details', eventId] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
    },
  })
}

export function useLeaderEvents(view: 'active' | 'history') {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['events', 'leader', view, user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaderEventRow[]>(`/events/leader?view=${view}`)
      return data
    },
    enabled: !!user,
  })
}

export function useSubmitEventCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { eventId: string; squadId: string; code: string }) => {
      const { data } = await apiClient.post(`/events/${body.eventId}/submit-code`, {
        squadId: body.squadId,
        code: body.code,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'leader'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
    },
  })
}
