import { useState } from 'react'
import { useChildBalance } from '../../features/children'
import { useWorkerReward, type RewardItem } from '../../features/rewards'
import { useSearchChildren, useSpendTalents } from '../../features/transactions'

function SpendSheet({
  child,
  items,
  onClose,
}: {
  child: { id: string; firstName: string; lastName: string }
  items: RewardItem[]
  onClose: () => void
}) {
  const { data: balance = 0 } = useChildBalance(child.id)
  const [selected, setSelected] = useState<RewardItem | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const { mutate: spend, isPending } = useSpendTalents()

  function handleSpend() {
    if (!selected) return
    setError('')
    spend(
      { childId: child.id, amount: selected.price, reason: selected.name, comment: comment || undefined },
      {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          setError(msg === 'Insufficient balance' ? 'Недостатньо балансу' : 'Помилка списання')
        },
      },
    )
  }

  const activeItems = items.filter((i) => i.isActive)

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[85dvh] flex flex-col">
        <div className="p-6 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{child.firstName} {child.lastName}</h2>
              <p className="text-sm text-gray-400 mt-0.5">Баланс: <span className="font-bold text-violet-600">⭐ {balance}</span></p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Оберіть товар</p>

          {activeItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Позицій немає. Зверніться до адміна.</p>
          ) : (
            <div className="space-y-2">
              {activeItems.map((item) => (
                <button key={item.id} onClick={() => setSelected(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                    selected?.id === item.id ? 'border-violet-500 bg-violet-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                  <span className={`text-sm font-bold ${item.price > balance ? 'text-red-400' : 'text-violet-600'}`}>
                    ⭐ {item.price}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Коментар</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Необов'язково" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm font-medium">❌ {error}</p>
            </div>
          )}

          <button onClick={handleSpend} disabled={!selected || isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-40 active:scale-95 transition-transform">
            {isPending ? 'Списання...' : selected ? `Списати ⭐ ${selected.price}` : 'Оберіть товар'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SpendCoinsPage() {
  const { data: reward, isLoading: loadingReward } = useWorkerReward()
  const [q, setQ] = useState('')
  const { data: results, isFetching } = useSearchChildren(q)
  const [selectedChild, setSelectedChild] = useState<{ id: string; firstName: string; lastName: string } | null>(null)

  if (loadingReward) {
    return <div className="p-4 text-center pt-20 text-gray-400">Завантаження...</div>
  }

  if (!reward) {
    return (
      <div className="p-4 text-center pt-20 text-gray-400">
        <p className="text-4xl mb-3">🛍️</p>
        <p className="font-semibold text-gray-700">Магазин не призначено</p>
        <p className="text-sm mt-1">Зверніться до адміністратора</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Shop info */}
      <div className="bg-violet-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl">🛍️</div>
        <div>
          <p className="font-bold text-gray-900">{reward.name}</p>
          {reward.description && <p className="text-sm text-gray-500">{reward.description}</p>}
          <p className="text-xs text-violet-600 mt-0.5">{reward.items?.filter((i) => i.isActive).length ?? 0} позицій</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Знайти дитину</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Ім'я або прізвище..."
            autoComplete="off"
          />
        </div>
        {q.length > 0 && q.length < 2 && (
          <p className="text-xs text-gray-400 mt-1">Введіть ще {2 - q.length} символ...</p>
        )}
      </div>

      {/* Results */}
      {q.length >= 2 && (
        <div className="space-y-2">
          {isFetching && <div className="text-sm text-gray-400 text-center py-4">Пошук...</div>}
          {!isFetching && results?.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-6">
              <p>Нікого не знайдено за "{q}"</p>
            </div>
          )}
          {results?.map((child) => (
            <button key={child.id} onClick={() => setSelectedChild(child)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform text-left">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">👤</div>
              <p className="font-semibold text-gray-900">{child.firstName} {child.lastName}</p>
              <span className="ml-auto text-violet-500">›</span>
            </button>
          ))}
        </div>
      )}

      {selectedChild && reward.items && (
        <SpendSheet child={selectedChild} items={reward.items} onClose={() => { setSelectedChild(null); setQ('') }} />
      )}
    </div>
  )
}


