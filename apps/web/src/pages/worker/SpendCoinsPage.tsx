import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { useChildBalance, useChildren } from '../../features/children'
import { useWorkerRewards, type RewardItem } from '../../features/rewards'
import { useSquads } from '../../features/squads'
import { useSearchChildren, useSpendCoins } from '../../features/transactions'
import { BottomSheet } from '../../shared/ui'

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
  const { mutate: spend, isPending } = useSpendCoins()

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
    <BottomSheet onClose={onClose} className="max-h-[85dvh] flex flex-col">
      <div className="p-6 pb-3 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{child.firstName} {child.lastName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Баланс: <span className="inline-flex items-center gap-1 font-bold text-violet-600"><Coins className="w-4 h-4 text-yellow-500" /> {balance}</span></p>
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
                  <span className="inline-flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" /> {item.price}
                  </span>
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
          {isPending ? 'Списання...' : selected ? <span className="inline-flex items-center justify-center gap-1"><Coins className="w-4 h-4 text-yellow-500" /> Списати {selected.price}</span> : 'Оберіть товар'}
        </button>
      </div>
    </BottomSheet>
  )
}

export function SpendCoinsPage() {
  const { data: rewards, isLoading: loadingReward } = useWorkerRewards()
  const { data: squads = [] } = useSquads()
  const [q, setQ] = useState('')
  const { data: results, isFetching } = useSearchChildren(q)
  const [selectedChild, setSelectedChild] = useState<{ id: string; firstName: string; lastName: string } | null>(null)
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null)
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const { data: squadChildren = [], isLoading: loadingSquadChildren } = useChildren(selectedSquadId ?? undefined)

  useEffect(() => {
    if (!selectedRewardId && rewards && rewards.length > 0) {
      setSelectedRewardId(rewards[0].id)
    }
  }, [rewards, selectedRewardId])

  useEffect(() => {
    if (!selectedSquadId && squads.length > 0) {
      setSelectedSquadId(squads[0].id)
    }
  }, [selectedSquadId, squads])

  const rewardList = rewards ?? []
  const selectedReward =
    rewardList.find((reward) => reward.id === selectedRewardId) ?? rewardList[0] ?? null

  if (loadingReward) {
    return <div className="p-4 text-center pt-20 text-gray-400">Завантаження...</div>
  }

  if (rewardList.length === 0) {
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
    {rewardList.length > 1 && (
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Оберіть точку</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rewardList.map((reward) => (
            <button
              key={reward.id}
              onClick={() => setSelectedRewardId(reward.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold border ${
                selectedReward?.id === reward.id
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {reward.name}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Shop info */}
    <div className="bg-violet-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
      <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl">🛍️</div>
      <div>
        <p className="font-bold text-gray-900">{selectedReward?.name}</p>
        {selectedReward?.description && <p className="text-sm text-gray-500">{selectedReward.description}</p>}
        <p className="text-xs text-violet-600 mt-0.5">
          {selectedReward?.items?.filter((i) => i.isActive).length ?? 0} позицій
        </p>
      </div>
    </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Знайти дитину по всьому табору</label>
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

      <div className="mt-6">
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">Або оберіть загін</p>
        </div>

        {squads.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {squads.map((squad) => (
              <button
                key={squad.id}
                onClick={() => setSelectedSquadId(squad.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold border ${
                  selectedSquadId === squad.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {squad.name}
              </button>
            ))}
          </div>
        )}

        {selectedSquadId && (
          <div className="space-y-2">
            {loadingSquadChildren && (
              <div className="text-sm text-gray-400 text-center py-4">Завантаження дітей...</div>
            )}

            {!loadingSquadChildren && squadChildren.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6">
                <p>У цьому загоні ще немає дітей</p>
              </div>
            )}

            {!loadingSquadChildren &&
              squadChildren.map((child) => (
                <button
                  key={child.id}
                  onClick={() =>
                    setSelectedChild({
                      id: child.id,
                      firstName: child.firstName,
                      lastName: child.lastName,
                    })
                  }
                  className="w-full bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {child.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <p className="font-semibold text-gray-900">
                    {child.firstName} {child.lastName}
                  </p>
                  <span className="ml-auto text-violet-500">›</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {selectedChild && selectedReward?.items && (
        <SpendSheet
          child={selectedChild}
          items={selectedReward.items}
          onClose={() => {
            setSelectedChild(null)
            setQ('')
          }}
        />
      )}
    </div>
  )
}
