import { useState } from 'react'
import {
  type Reward,
  type RewardItem,
  useAssignWorker,
  useCreateReward,
  useCreateRewardItem,
  useRewardDetail,
  useRewards,
  useToggleRewardItem,
} from '../../features/rewards'
import { useUsers } from '../../features/users'

// --- Item row ---
function ItemRow({ item, rewardId }: { item: RewardItem; rewardId: string }) {
  const { mutate: toggle } = useToggleRewardItem(rewardId)
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${!item.isActive ? 'opacity-40' : ''}`}>
      <div>
        <p className="text-sm font-medium text-gray-800">{item.name}</p>
        <p className="text-xs text-violet-600 font-semibold">⭐ {item.price}</p>
      </div>
      <button onClick={() => toggle({ itemId: item.id, isActive: !item.isActive })}
        className={`text-xs px-2 py-1 rounded-lg font-medium ${item.isActive ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
        {item.isActive ? 'Вимкнути' : 'Увімкнути'}
      </button>
    </div>
  )
}

// --- Shop Detail Sheet ---
function ShopDetailSheet({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const { data: detail } = useRewardDetail(reward.id)
  const { data: users } = useUsers()
  const { mutate: assignWorker } = useAssignWorker(reward.id)
  const { mutate: createItem, isPending: addingItem } = useCreateRewardItem(reward.id)

  const [newItem, setNewItem] = useState({ name: '', price: '' })
  const [showAddItem, setShowAddItem] = useState(false)

  const workers = users?.filter((u) => u.role === 'Worker' && u.isActive) ?? []
  const assignedWorker = users?.find((u) => u.id === detail?.workerId)

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    createItem(
      { name: newItem.name, price: Number(newItem.price) },
      { onSuccess: () => setNewItem({ name: '', price: '' }) },
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
        <div className="p-6 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">{reward.name}</h2>
          {reward.description && <p className="text-sm text-gray-400 mt-0.5">{reward.description}</p>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-5">
          {/* Assign Worker */}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Воркер</p>
            {assignedWorker ? (
              <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700">
                    {assignedWorker.firstName[0]}{assignedWorker.lastName[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{assignedWorker.firstName} {assignedWorker.lastName}</span>
                </div>
                <button onClick={() => assignWorker(null)} className="text-xs text-gray-300 active:text-red-400">✕</button>
              </div>
            ) : (
              <div className="space-y-2">
                {workers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Немає воркерів. Спочатку створіть.</p>
                ) : workers.map((w) => (
                  <button key={w.id} onClick={() => assignWorker(w.id)}
                    className="w-full flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 active:bg-violet-50 text-left">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                      {w.firstName[0]}{w.lastName[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{w.firstName} {w.lastName}</span>
                    <span className="ml-auto text-violet-500">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Позиції</p>
              <button onClick={() => setShowAddItem(!showAddItem)}
                className="text-sm text-violet-600 font-medium">
                {showAddItem ? 'Скасувати' : '+ Додати'}
              </button>
            </div>

            {showAddItem && (
              <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
                <input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  required placeholder="Назва" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <input type="number" min="1" value={newItem.price} onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                  required placeholder="⭐" className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button type="submit" disabled={addingItem}
                  className="px-3 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  OK
                </button>
              </form>
            )}

            {detail?.items?.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Позицій ще немає</p>
            ) : (
              <div>{detail?.items?.map((item) => <ItemRow key={item.id} item={item} rewardId={reward.id} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Create Shop Sheet ---
function CreateShopSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { mutate, isPending, error } = useCreateReward()

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Нова точка</h2>
        <form onSubmit={(e) => { e.preventDefault(); mutate({ name, description: description || undefined }, { onSuccess: onClose }) }} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Магазин солодощів, Батут..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Необов'язково" />
          </div>
          {error && <p className="text-red-500 text-sm">Помилка створення</p>}
          <button type="submit" disabled={isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
            {isPending ? 'Створення...' : 'Створити'}
          </button>
        </form>
      </div>
    </div>
  )
}

// --- Main Page ---
export function RewardsPage() {
  const { data: rewards, isLoading } = useRewards()
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Reward | null>(null)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Магазин</h1>
          <p className="text-sm text-gray-400 mt-0.5">Точки обслуговування</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
      ) : rewards?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-medium">Точок ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб створити магазин або батут</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards?.map((r) => (
            <button key={r.id} onClick={() => setSelected(r)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
                🛍️
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{r.name}</p>
                {r.description && <p className="text-sm text-gray-400 truncate">{r.description}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.workerId
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Воркер є</span>
                  : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Без воркера</span>}
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateShopSheet onClose={() => setShowCreate(false)} />}
      {selected && <ShopDetailSheet reward={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}


