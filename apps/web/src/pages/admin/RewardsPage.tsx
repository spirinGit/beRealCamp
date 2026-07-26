import { useState } from 'react'
import {
  type Reward,
  type RewardItem,
  useAssignWorker,
  useCreateReward,
  useCreateRewardAvatarUploadUrl,
  useCreateRewardItem,
  useCreateRewardItemAvatarUploadUrl,
  useDeleteReward,
  useRewardDetail,
  useRewards,
  useToggleRewardItem,
  useUnassignWorker,
  useUpdateReward,
  useUpdateRewardItem,
} from '../../features/rewards'
import { useUsers } from '../../features/users'
import { BottomSheet } from '../../shared/ui'

async function uploadRewardFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!res.ok) throw new Error('Upload failed')
}

// --- Item row ---
function ItemRow({ item, rewardId, onEdit }: { item: RewardItem; rewardId: string; onEdit: (item: RewardItem) => void }) {
  const { mutate: toggle } = useToggleRewardItem(rewardId)
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 ${!item.isActive ? 'opacity-40' : ''}`}>
      {item.photoUrl
        ? <img src={item.photoUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🏷️</div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{item.name}</p>
        <p className="text-xs text-violet-600 font-semibold">⭐ {item.price}</p>
      </div>
      <button onClick={() => onEdit(item)} className="text-xs text-gray-400 active:text-violet-500 px-1">✏️</button>
      <button onClick={() => toggle({ itemId: item.id, isActive: !item.isActive })}
        className={`text-xs px-2 py-1 rounded-lg font-medium ${item.isActive ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
        {item.isActive ? 'Вимкн.' : 'Увімкн.'}
      </button>
    </div>
  )
}

// --- Edit Item Sheet ---
function EditItemSheet({ item, rewardId, onClose }: { item: RewardItem; rewardId: string; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutateAsync: updateItem, isPending } = useUpdateRewardItem(rewardId)
  const { mutateAsync: createUploadUrl, isPending: isUploading } = useCreateRewardItemAvatarUploadUrl()

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSubmitError('JPEG, PNG або WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Максимум 5 MB'); return }
    setSubmitError(null); setAvatarFile(file); setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createUploadUrl({ contentType: avatarFile.type })
        await uploadRewardFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      await updateItem({ itemId: item.id, name: name.trim(), price: Number(price), ...(photoUrl ? { photoUrl } : {}) })
      onClose()
    } catch { setSubmitError('Помилка збереження') }
  }

  const displayPhoto = avatarPreviewUrl ?? item.photoUrl

  return (
    <BottomSheet onClose={onClose} zIndex="z-40" className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
      <p className="text-lg font-bold text-gray-900">Редагувати позицію</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {displayPhoto ? <img src={displayPhoto} alt={item.name} className="w-full h-full object-cover" /> : <span>🏷️</span>}
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {item.photoUrl || avatarPreviewUrl ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ціна ⭐ *</label>
          <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isPending || isUploading}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
          {isPending || isUploading ? 'Збереження...' : 'Зберегти'}
        </button>
      </form>
    </BottomSheet>
  )
}

// --- Edit Shop Sheet ---
function EditShopSheet({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const [name, setName] = useState(reward.name)
  const [description, setDescription] = useState(reward.description ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutateAsync: updateReward, isPending } = useUpdateReward(reward.id)
  const { mutateAsync: createUploadUrl, isPending: isUploading } = useCreateRewardAvatarUploadUrl()
  const { mutate: deleteReward, isPending: isDeleting } = useDeleteReward()

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSubmitError('JPEG, PNG або WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Максимум 5 MB'); return }
    setSubmitError(null); setAvatarFile(file); setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createUploadUrl({ contentType: avatarFile.type })
        await uploadRewardFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      await updateReward({ name: name.trim(), description: description.trim() || undefined, ...(photoUrl ? { photoUrl } : {}) })
      onClose()
    } catch { setSubmitError('Помилка збереження') }
  }

  function handleDelete() {
    if (!window.confirm(`Видалити "${reward.name}"?`)) return
    deleteReward(reward.id, { onSuccess: onClose })
  }

  const displayPhoto = avatarPreviewUrl ?? reward.photoUrl

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
      <p className="text-lg font-bold text-gray-900">Редагувати точку</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {displayPhoto ? <img src={displayPhoto} alt={reward.name} className="w-full h-full object-cover" /> : <span>🛍️</span>}
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {reward.photoUrl || avatarPreviewUrl ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Необов'язково" />
        </div>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isPending || isUploading}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
          {isPending || isUploading ? 'Збереження...' : 'Зберегти'}
        </button>
        <div className="pt-2 border-t border-gray-100">
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold disabled:opacity-50 active:bg-red-50">
            {isDeleting ? 'Видалення...' : 'Видалити точку'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

// --- Shop Detail Sheet ---
function ShopDetailSheet({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const { data: detail } = useRewardDetail(reward.id)
  const { data: users } = useUsers()
  const { mutate: assignWorker } = useAssignWorker(reward.id)
  const { mutate: unassignWorker } = useUnassignWorker(reward.id)
  const { mutate: createItem, isPending: addingItem } = useCreateRewardItem(reward.id)
  const [newItem, setNewItem] = useState({ name: '', price: '' })
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null)

  const assignedWorkerIds = detail?.workerIds ?? []
  const allWorkers = users?.filter((u) => u.role === 'Worker' && u.isActive) ?? []
  const assignedWorkers = allWorkers.filter((u) => assignedWorkerIds.includes(u.id))
  const availableWorkers = allWorkers.filter((u) => !assignedWorkerIds.includes(u.id))

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    createItem(
      { name: newItem.name, price: Number(newItem.price) },
      { onSuccess: () => setNewItem({ name: '', price: '' }) },
    )
  }

  return (
    <BottomSheet onClose={onClose} className="max-h-[90dvh] flex flex-col">
      <div className="p-6 pb-3 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
            {reward.photoUrl ? <img src={reward.photoUrl} alt={reward.name} className="w-full h-full object-cover" /> : <span>🛍️</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{reward.name}</h2>
            {reward.description && <p className="text-sm text-gray-400 mt-0.5">{reward.description}</p>}
          </div>
          <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✏️</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-5">
        {/* Assign Workers */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Воркери</p>
          <div className="space-y-2">
            {assignedWorkers.map((w) => (
              <div key={w.id} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700 overflow-hidden">
                    {w.photoUrl
                      ? <img src={w.photoUrl} alt="" className="w-full h-full object-cover" />
                      : `${w.firstName[0]}${w.lastName[0]}`}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{w.firstName} {w.lastName}</span>
                </div>
                <button onClick={() => unassignWorker(w.id)} className="text-xs text-gray-300 active:text-red-400">✕</button>
              </div>
            ))}
            {availableWorkers.length > 0 && (
              <div className="space-y-1 pt-1">
                {availableWorkers.map((w) => (
                  <button key={w.id} onClick={() => assignWorker(w.id)}
                    className="w-full flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 active:bg-violet-50 text-left">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                      {w.photoUrl ? <img src={w.photoUrl} alt="" className="w-full h-full object-cover" /> : `${w.firstName[0]}${w.lastName[0]}`}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{w.firstName} {w.lastName}</span>
                    <span className="ml-auto text-violet-500">+</span>
                  </button>
                ))}
              </div>
            )}
            {allWorkers.length === 0 && (
              <p className="text-sm text-gray-400 italic">Немає воркерів. Спочатку створіть.</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Позиції</p>
            <button onClick={() => setShowAddItem(!showAddItem)} className="text-sm text-violet-600 font-medium">
              {showAddItem ? 'Скасувати' : '+ Додати'}
            </button>
          </div>
          {showAddItem && (
            <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
              <input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                required placeholder="Назва" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <input type="number" min="1" value={newItem.price} onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                required placeholder="⭐" className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button type="submit" disabled={addingItem} className="px-3 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">OK</button>
            </form>
          )}
          {detail?.items?.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Позицій ще немає</p>
          ) : (
            <div>{detail?.items?.map((item) => <ItemRow key={item.id} item={item} rewardId={reward.id} onEdit={setEditingItem} />)}</div>
          )}
        </div>
      </div>

      {showEdit && <EditShopSheet reward={reward} onClose={() => setShowEdit(false)} />}
      {editingItem && <EditItemSheet item={editingItem} rewardId={reward.id} onClose={() => setEditingItem(null)} />}
    </BottomSheet>
  )
}

// --- Create Shop Sheet ---
function CreateShopSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { mutate, isPending, error } = useCreateReward()

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
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
    </BottomSheet>
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
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {r.photoUrl ? <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" /> : <span>🛍️</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{r.name}</p>
                {r.description && <p className="text-sm text-gray-400 truncate">{r.description}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                {(r.workerIds?.length ?? 0) > 0
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Воркерів: {r.workerIds.length}</span>
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


