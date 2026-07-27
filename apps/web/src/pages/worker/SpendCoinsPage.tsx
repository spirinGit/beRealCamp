import { useEffect, useMemo, useState } from 'react'
import { Coins } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useChildBalance, useChildren } from '../../features/children'
import { useWorkerRewards, type RewardItem } from '../../features/rewards'
import { useSquads } from '../../features/squads'
import { useSearchChildren, useSpendCoins } from '../../features/transactions'
import { BottomSheet, Toast } from '../../shared/ui'

function SpendSheet({
  child,
  items,
  onClose,
  onSuccess,
  onError,
  isToastActive,
}: {
  child: { id: string; firstName: string; lastName: string }
  items: RewardItem[]
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  isToastActive: boolean
}) {
  const { data: balance = 0 } = useChildBalance(child.id)
  const [selected, setSelected] = useState<RewardItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [comment, setComment] = useState('')
  const [itemQuery, setItemQuery] = useState('')
  const [itemSort, setItemSort] = useState<'name' | 'price-asc' | 'price-desc'>('name')
  const { mutate: spend, isPending } = useSpendCoins()

  const totalPrice = selected ? selected.price * quantity : 0
  const canIncrease = selected ? totalPrice + selected.price <= balance : false
  const canDecrease = quantity > 1

  function handleSpend() {
    if (!selected) return

    const spendAmount = selected.price * quantity
    spend(
      {
        childId: child.id,
        amount: spendAmount,
        reason: quantity > 1 ? `${selected.name} x${quantity}` : selected.name,
        comment: comment || undefined,
        metadata: {
          itemId: selected.id,
          itemName: selected.name,
          unitPrice: selected.price,
          quantity,
          totalPrice: spendAmount,
        },
      },
      {
        onSuccess: () => {
          onSuccess(quantity > 1 ? `${selected.name} x${quantity} списано за ${spendAmount} ⭐` : `${selected.name} списано за ${spendAmount} ⭐`)
          setTimeout(() => onClose(), 3500)
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          const errorMsg = msg === 'Insufficient balance' ? 'Недостатньо балансу для цього списання' : 'Помилка списання'
          onError(errorMsg)
        },
      },
    )
  }

  const activeItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase()
    const filtered = items
      .filter((i) => i.isActive)
      .filter((i) => (query ? i.name.toLowerCase().includes(query) : true))

    return [...filtered].sort((a, b) => {
      if (itemSort === 'price-asc') return a.price - b.price || a.name.localeCompare(b.name)
      if (itemSort === 'price-desc') return b.price - a.price || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })
  }, [itemQuery, itemSort, items])

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
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Пошук товару..."
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Сортування</label>
            <select
              value={itemSort}
              onChange={(e) => setItemSort(e.target.value as typeof itemSort)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="name">За назвою</option>
              <option value="price-asc">За ціною: від дешевших</option>
              <option value="price-desc">За ціною: від дорожчих</option>
            </select>
          </div>
        </div>
        {activeItems.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {itemQuery.trim() ? `Нічого не знайдено за "${itemQuery.trim()}"` : 'Позицій немає. Зверніться до адміна.'}
          </p>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelected(item)
                  setQuantity(1)
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left cursor-pointer ${
                  selected?.id === item.id ? 'border-violet-500 bg-violet-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  {selected?.id === item.id && quantity > 1 && (
                    <p className={`text-xs mt-1 font-semibold ${totalPrice > balance ? 'text-red-500' : 'text-violet-600'}`}>
                      Разом: <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-yellow-500" /> {totalPrice}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected?.id === item.id ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setQuantity((prev) => Math.max(1, prev - 1))
                        }}
                        disabled={!canDecrease || isPending || isToastActive}
                        className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-700 disabled:opacity-35 disabled:cursor-not-allowed"
                        aria-label="Зменшити кількість"
                      >
                        −
                      </button>
                      <div className="min-w-8 text-center text-sm font-semibold text-gray-900">x{quantity}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canIncrease) setQuantity((prev) => prev + 1)
                        }}
                        disabled={!canIncrease || isPending || isToastActive}
                        className="w-8 h-8 rounded-full border border-violet-200 bg-violet-600 text-white disabled:opacity-35 disabled:cursor-not-allowed"
                        aria-label="Збільшити кількість"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <span className={`text-sm font-bold ${item.price > balance ? 'text-red-400' : 'text-violet-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" /> {item.price}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Коментар</label>
          <input value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Необов'язково" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Підсумок</span>
          <span className={`font-bold ${totalPrice > balance ? 'text-red-500' : 'text-violet-600'}`}>
            {selected ? (
              <span className="inline-flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-500" /> {totalPrice}
              </span>
            ) : (
              '0'
            )}
          </span>
        </div>
        <button onClick={handleSpend} disabled={!selected || isPending || isToastActive || totalPrice > balance}
          className="w-full bg-violet-600 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-40 active:scale-95 transition-transform">
          {isPending || isToastActive
            ? 'Списання...'
            : selected
              ? <span className="inline-flex items-center justify-center gap-1"><Coins className="w-4 h-4 text-yellow-500" /> Списати {totalPrice}</span>
              : 'Оберіть товар'}
        </button>
      </div>
    </BottomSheet>
  )
}

export function SpendCoinsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: rewards, isLoading: loadingReward } = useWorkerRewards()
  const { data: squads = [] } = useSquads()
  const [q, setQ] = useState('')
  const [squadQuery, setSquadQuery] = useState('')
  const { data: results, isFetching } = useSearchChildren(q)
  const [selectedChildOverride, setSelectedChildOverride] = useState<{ id: string; firstName: string; lastName: string } | null>(null)
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null)
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isToastActive, setIsToastActive] = useState(false)
  const { data: squadChildren = [], isLoading: loadingSquadChildren } = useChildren(selectedSquadId ?? undefined)
  const selectedChildId = searchParams.get('childId')

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
  const filteredSquadChildren = useMemo(() => {
    const query = squadQuery.trim().toLowerCase()
    if (!query) return squadChildren

    return squadChildren.filter((child) => {
      const fullName = `${child.firstName} ${child.lastName}`.toLowerCase()
      return fullName.includes(query)
    })
  }, [squadChildren, squadQuery])
  const selectedChild = useMemo(() => {
    if (!selectedChildId) return null
    if (selectedChildOverride?.id === selectedChildId) return selectedChildOverride

    const fromSearch = results?.find((child) => child.id === selectedChildId)
    if (fromSearch) {
      return {
        id: fromSearch.id,
        firstName: fromSearch.firstName,
        lastName: fromSearch.lastName,
      }
    }

    const fromSquad = squadChildren.find((child) => child.id === selectedChildId)
    if (fromSquad) {
      return {
        id: fromSquad.id,
        firstName: fromSquad.firstName,
        lastName: fromSquad.lastName,
      }
    }

    return null
  }, [results, selectedChildId, selectedChildOverride, squadChildren])

  function openChildSheet(child: { id: string; firstName: string; lastName: string }) {
    // Ignore background taps while the spend sheet is already open.
    if (selectedChildId) return
    setSelectedChildOverride(child)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('childId', child.id)
    setSearchParams(nextParams, { replace: Boolean(selectedChildId) })
  }

  function closeChildSheet() {
    setSelectedChildOverride(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: true })
    setQ('')
  }

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
            <button key={child.id} onClick={() => openChildSheet(child)}
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
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Пошук у загоні</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  value={squadQuery}
                  onChange={(e) => setSquadQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ім'я або прізвище..."
                  autoComplete="off"
                />
              </div>
            </div>

            {loadingSquadChildren && (
              <div className="text-sm text-gray-400 text-center py-4">Завантаження дітей...</div>
            )}

            {!loadingSquadChildren && squadChildren.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6">
                <p>У цьому загоні ще немає дітей</p>
              </div>
            )}

            {!loadingSquadChildren && squadChildren.length > 0 && filteredSquadChildren.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-6">
                <p>Нікого не знайдено за "{squadQuery.trim()}"</p>
              </div>
            )}

            {!loadingSquadChildren &&
              filteredSquadChildren.map((child) => (
                <button
                  key={child.id}
                  onClick={() =>
                    openChildSheet({
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
          onClose={closeChildSheet}
          onSuccess={(msg) => {
            setToast({ message: msg, type: 'success' })
            setIsToastActive(true)
            setTimeout(() => {
              setIsToastActive(false)
              setToast(null)
            }, 3000)
          }}
          onError={(msg) => {
            setToast(null)
            setTimeout(() => setToast({ message: msg, type: 'error' }), 100)
          }}
          isToastActive={isToastActive}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} duration={toast.type === 'error' ? 5000 : 3000} />}
    </div>
  )
}
