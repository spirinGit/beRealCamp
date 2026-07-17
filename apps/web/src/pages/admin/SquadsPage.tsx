import { useState } from 'react'
import { useChildren } from '../../features/children'
import {
  type Squad,
  useAssignLeader,
  useCreateSquad,
  useCreateSquadAvatarUploadUrl,
  useRemoveLeader,
  useSquadLeaders,
  useSquads,
  useUpdateSquad,
} from '../../features/squads'
import { useUsers } from '../../features/users'
import { BottomSheet } from '../../shared/ui'

async function uploadSquadAvatarFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!res.ok) throw new Error('Upload failed')
}

const COLORS = [
  { value: '#ef4444' }, { value: '#f97316' }, { value: '#eab308' },
  { value: '#22c55e' }, { value: '#3b82f6' }, { value: '#8b5cf6' },
  { value: '#ec4899' }, { value: '#14b8a6' },
]

// --- Squad Detail Sheet ---
function SquadDetailSheet({ squad, onClose }: { squad: Squad; onClose: () => void }) {
  const { data: leaders } = useSquadLeaders(squad.id)
  const { data: children, isLoading: isChildrenLoading } = useChildren(squad.id)
  const { data: users } = useUsers()
  const { mutate: assign, isPending: assigning } = useAssignLeader(squad.id)
  const { mutate: remove } = useRemoveLeader(squad.id)

  const leaderIds = new Set(leaders?.map((l) => l.id))
  const availableLeaders = users?.filter((u) => u.role === 'Leader' && u.isActive && !leaderIds.has(u.id)) ?? []

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-5 max-h-[85dvh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        {/* Squad header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: squad.color }} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">{squad.name}</h2>
            {squad.description && <p className="text-sm text-gray-400">{squad.description}</p>}
          </div>
        </div>

        {/* Current leaders */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Лідери загону</p>
          {leaders?.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Лідерів ще не призначено</p>
          ) : (
            <div className="space-y-2">
              {leaders?.map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {l.firstName[0]}{l.lastName[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{l.firstName} {l.lastName}</span>
                  </div>
                  <button
                    onClick={() => remove(l.id)}
                    className="text-xs text-gray-300 active:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Squad children */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Діти загону</p>
          {isChildrenLoading ? (
            <div className="space-y-2">
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : children?.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Дітей у загоні ще немає</p>
          ) : (
            <div className="space-y-2">
              {children?.map((child) => (
                <div key={child.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                  <span className="text-lg">{child.gender === 'male' ? '👦' : '👧'}</span>
                  <span className="text-sm font-medium text-gray-800">
                    {child.firstName} {child.lastName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign leader */}
        {availableLeaders.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Призначити лідера</p>
            <div className="space-y-2">
              {availableLeaders.map((u) => (
                <button
                  key={u.id}
                  onClick={() => assign(u.id)}
                  disabled={assigning}
                  className="w-full flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 active:bg-violet-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <span className="ml-auto text-violet-500 text-lg">+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {availableLeaders.length === 0 && leaders?.length === 0 && (
          <p className="text-sm text-gray-400">Спочатку створіть лідерів у розділі Юзери</p>
        )}
    </BottomSheet>
  )
}

// --- Create Squad Sheet ---
function CreateSquadSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const [description, setDescription] = useState('')
  const { mutate, isPending, error } = useCreateSquad()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ name, color, description: description || undefined }, { onSuccess: onClose })
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Новий загін</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Орли, Соколи..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Колір *</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className="w-9 h-9 rounded-full border-2 transition-transform active:scale-95"
                  style={{ backgroundColor: c.value, borderColor: color === c.value ? '#1f2937' : 'transparent' }} />
              ))}
            </div>
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
            {isPending ? 'Створення...' : 'Створити загін'}
          </button>
        </form>
    </BottomSheet>
  )
}

// --- Edit Squad Sheet ---
function EditSquadSheet({ squad, onClose }: { squad: Squad; onClose: () => void }) {
  const [name, setName] = useState(squad.name)
  const [color, setColor] = useState(squad.color)
  const [description, setDescription] = useState(squad.description ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutateAsync: updateSquad, isPending } = useUpdateSquad(squad.id)
  const { mutateAsync: createAvatarUploadUrl, isPending: isUploading } = useCreateSquadAvatarUploadUrl()

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSubmitError('JPEG, PNG або WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Максимум 5 MB'); return }
    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createAvatarUploadUrl({ contentType: avatarFile.type })
        await uploadSquadAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      await updateSquad({ name: name.trim(), color, description: description.trim() || undefined, ...(photoUrl ? { photoUrl } : {}) })
      onClose()
    } catch {
      setSubmitError('Помилка збереження')
    }
  }

  const displayPhoto = avatarPreviewUrl ?? squad.photoUrl

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
      <p className="text-lg font-bold text-gray-900">Редагувати загін</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото загону</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: color }}>
              {displayPhoto && <img src={displayPhoto} alt={name} className="w-full h-full object-cover" />}
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {squad.photoUrl || avatarPreviewUrl ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Орли, Соколи..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Колір</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)}
                className="w-9 h-9 rounded-full border-2 transition-transform active:scale-95"
                style={{ backgroundColor: c.value, borderColor: color === c.value ? '#1f2937' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Необов'язково" />
        </div>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isPending || isUploading}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
          {isPending || isUploading ? 'Збереження...' : 'Зберегти'}
        </button>
      </form>
    </BottomSheet>
  )
}

// --- Main Page ---
export function SquadsPage() {
  const { data: squads, isLoading } = useSquads()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Загони</h1>
          <p className="text-sm text-gray-400 mt-0.5">{squads?.length ?? 0} загонів у таборі</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : squads?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="font-medium">Загонів ще немає</p>
          <p className="text-sm mt-1">Натисніть +, щоб створити перший</p>
        </div>
      ) : (
        <div className="space-y-3">
          {squads?.map((squad) => (
            <button key={squad.id}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
              <button onClick={() => setSelectedSquad(squad)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: squad.color }}>
                  {squad.photoUrl && <img src={squad.photoUrl} alt={squad.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base">{squad.name}</p>
                  {squad.description && <p className="text-sm text-gray-400 truncate mt-0.5">{squad.description}</p>}
                </div>
              </button>
              <button onClick={() => setEditingSquad(squad)} className="text-gray-400 text-sm font-medium px-2 py-1 rounded-lg bg-gray-50 active:bg-gray-100">
                ✏️
              </button>
              <button onClick={() => setSelectedSquad(squad)} className="text-gray-300 text-lg">›</button>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateSquadSheet onClose={() => setShowCreate(false)} />}
      {selectedSquad && <SquadDetailSheet squad={selectedSquad} onClose={() => setSelectedSquad(null)} />}
      {editingSquad && <EditSquadSheet squad={editingSquad} onClose={() => setEditingSquad(null)} />}
    </div>
  )
}
