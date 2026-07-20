import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { apiClient } from '../../shared/api/client'
import { BottomSheet } from '../../shared/ui'

interface CoinRule {
  id: string
  key: string
  label: string
  points: number
  isActive: boolean
}

function useRules() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['coin-rules', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

function useToggleRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/coin-rules/${id}/toggle`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-rules'] }),
  })
}

function useCreateRule() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { label: string; points: number }) => {
      const { data } = await apiClient.post('/coin-rules', {
        ...body,
        key: body.label.toLowerCase().replace(/\s+/g, '_'),
        campId: effectiveCampId!,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-rules'] }),
  })
}

function RuleRow({ rule }: { rule: CoinRule }) {
  const { mutate: toggle, isPending } = useToggleRule()
  return (
    <div className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 ${!rule.isActive ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{rule.label}</p>
        <p className="text-xs text-violet-600 font-semibold mt-0.5">+{rule.points} коінів</p>
      </div>
      <button
        onClick={() => toggle(rule.id)}
        disabled={isPending}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors ${
          rule.isActive
            ? 'bg-gray-100 text-gray-500 active:bg-red-50 active:text-red-500'
            : 'bg-green-100 text-green-600'
        }`}
      >
        {rule.isActive ? 'Вимкнути' : 'Увімкнути'}
      </button>
    </div>
  )
}

function CreateRuleSheet({ onClose }: { onClose: () => void }) {
  const [label, setLabel] = useState('')
  const [points, setPoints] = useState('')
  const { mutate, isPending, error } = useCreateRule()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ label, points: Number(points) }, { onSuccess: onClose })
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Нове правило</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва правила *</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Командна робота, Добрі справи..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кількість коінів *</label>
            <input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="1000" />
          </div>
          {error && <p className="text-red-500 text-sm">Помилка створення</p>}
          <button type="submit" disabled={isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
            {isPending ? 'Створення...' : 'Створити'}
          </button>
        </form>
    </BottomSheet>
  )
}

export function RulesPage() {
  const { data: rules, isLoading } = useRules()
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const active = rules?.filter((r) => r.isActive) ?? []
  const inactive = rules?.filter((r) => !r.isActive) ?? []

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/more')} className="text-gray-400 text-2xl active:text-gray-600">‹</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Правила</h1>
          <p className="text-sm text-gray-400 mt-0.5">{active.length} активних пресетів</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : rules?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium">Правил ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб додати перший пресет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((r) => <RuleRow key={r.id} rule={r} />)}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-4 mb-2">Вимкнені</p>
              {inactive.map((r) => <RuleRow key={r.id} rule={r} />)}
            </>
          )}
        </div>
      )}

      {showCreate && <CreateRuleSheet onClose={() => setShowCreate(false)} />}
    </div>
  )
}

