import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../shared/api/client'

export interface SquadAttendanceOverview {
  squad: {
    id: string
    name: string
  }
  camp: {
    id: string
    startDate: string
    endDate: string
  }
  today: string
  days: string[]
  totals: {
    totalChildren: number
    presentToday: number
    applicableToday: number
  }
  children: Array<{
    id: string
    firstName: string
    lastName: string
    gender: 'male' | 'female'
    dateOfBirth: string
    parentName: string | null
    parentPhone: string | null
    medicalNotes: string | null
    createdAt: string
    attendance: Record<string, boolean>
  }>
}

export function useSquadAttendance(squadId?: string) {
  return useQuery({
    queryKey: ['attendance', 'squad', squadId],
    queryFn: async () => {
      const { data } = await apiClient.get<SquadAttendanceOverview>(`/attendance/squads/${squadId}`)
      return data
    },
    enabled: !!squadId,
  })
}

export function useMarkAttendance(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { childId: string; day: string; isPresent: boolean }) => {
      const { data } = await apiClient.post(`/attendance/children/${body.childId}`, {
        day: body.day,
        isPresent: body.isPresent,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'squad', squadId] })
    },
  })
}

export function useBulkMarkAttendance(squadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { childIds: string[]; day: string; isPresent: boolean }) => {
      await Promise.all(
        body.childIds.map((childId) =>
          apiClient.post(`/attendance/children/${childId}`, {
            day: body.day,
            isPresent: body.isPresent,
          }),
        ),
      )
      return { count: body.childIds.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'squad', squadId] })
    },
  })
}
