import { useState } from 'react'
import { BottomSheet } from '../../shared/ui'
import { useCreatePromoCode, usePromoCodes } from '../../features/promo-codes'

type PromoFilter = 'all' | 'inactive' | 'active'

function formatDate(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CreatePromoCodeSheet({ onClose }: { onClose: () => void }) {
  const [rewardPoints, setRewardPoints] = useState('10')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate, isPending } = useCreatePromoCode()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const points = Number(rewardPoints)
    if (!Number.isInteger(points) || points <= 0) {
      setSubmitError('Вкажіть ціле число балів більше 0')
      return
    }
    setSubmitError(null)
    mutate(points, { onSuccess: onClose })
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
      <p className="text-lg font-bold text-gray-900">Створити бонус-код</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Скільки балів нарахувати</label>
          <input
            type="number"
            min="1"
            step="1"
            value={rewardPoints}
            onChange={(e) => setRewardPoints(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Наприклад, 25"
          />
        </div>
        {submitError && <p className="text-sm text-red-500">{submitError}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {isPending ? 'Створення...' : 'Створити код'}
        </button>
      </form>
    </BottomSheet>
  )
}

export function PromoCodesPage() {
  const { data: codes = [], isLoading } = usePromoCodes()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filter, setFilter] = useState<PromoFilter>('all')

  const activeCount = codes.filter((item) => !!item.activatedAt).length
  const inactiveCount = codes.length - activeCount
  const filteredCodes = codes.filter((item) => {
    if (filter === 'active') return !!item.activatedAt
    if (filter === 'inactive') return !item.activatedAt
    return true
  })

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Коди</h1>
          <p className="text-sm text-gray-400 mt-0.5">Бонус-коди для дітей</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="font-medium">Кодів ще немає</p>
          <p className="text-sm mt-1">Створи перший через кнопку +</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                filter === 'all' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Усі ({codes.length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                filter === 'inactive' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Не актив. ({inactiveCount})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                filter === 'active' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Актив. ({activeCount})
            </button>
          </div>

          {filteredCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-3xl mb-2">🗂️</p>
              <p className="text-sm">За цим фільтром кодів немає</p>
            </div>
          ) : filteredCodes.map((item) => {
            const isActivated = !!item.activatedAt
            return (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-lg font-bold text-gray-900 tracking-wide">{item.code}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      isActivated ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isActivated ? 'Активований' : 'Не активований'}
                  </span>
                </div>

                <p className="text-sm text-violet-700 font-semibold mt-2">+{item.rewardPoints} балів</p>

                {isActivated ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Активував(ла): {item.activatedChildFirstName} {item.activatedChildLastName} · {item.activatedAt ? formatDate(item.activatedAt) : '—'}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Створено: {formatDate(item.createdAt)}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isCreateOpen && <CreatePromoCodeSheet onClose={() => setIsCreateOpen(false)} />}
    </div>
  )
}