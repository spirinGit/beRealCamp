import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/AuthContext'
import { apiClient } from '../../shared/api/client'

interface Stats {
  childrenCount: number
  squadsCount: number
  presentTodayCount: number
  totalEarned: number
  totalSpent: number
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { effectiveCampId } = useAuth()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<Stats>(`/stats?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
  })

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-sm text-gray-400 mt-0.5">Загальна статистика табору</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="👧" label="Дітей" value={stats?.childrenCount ?? 0} />
          <StatCard icon="🏕️" label="Загонів" value={stats?.squadsCount ?? 0} />
          <StatCard icon="✅" label="Присутні сьогодні" value={stats?.presentTodayCount ?? 0} />
          <StatCard icon="⭐" label="Нараховано" value={`${stats?.totalEarned ?? 0}`} />
          <StatCard icon="🛍️" label="Списано" value={`${stats?.totalSpent ?? 0}`} />
        </div>
      )}
    </div>
  )
}

