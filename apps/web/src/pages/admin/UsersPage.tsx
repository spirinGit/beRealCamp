import { useEffect, useState, type FormEvent } from 'react'
import {
  ROLE_COLORS,
  ROLE_LABELS,
  type User,
  useCreateUser,
  useCreateUserAvatarUploadUrl,
  useUpdateUser,
  useUsers,
} from '../../features/users'
import { BottomSheet } from '../../shared/ui'

async function uploadUserAvatarFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!res.ok) throw new Error('Upload failed')
}

const ROLES: User['role'][] = ['Administrator', 'Leader', 'Worker']

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500'

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`
  return <span>{initials || '?'}</span>
}

function RoleSelector({ value, onChange }: { value: User['role']; onChange: (role: User['role']) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Роль *</label>
      <div className="flex gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
              value === role
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  )
}

function UserCard({ user, onEdit }: { user: User; onEdit: (u: User) => void }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!user.isActive ? 'opacity-50' : ''}`}>
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0 overflow-hidden">
        {user.photoUrl
          ? <img src={user.photoUrl} alt={user.firstName} className="w-full h-full object-cover" />
          : <Initials firstName={user.firstName} lastName={user.lastName} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
        <p className="text-sm text-gray-400 truncate">{user.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
          {ROLE_LABELS[user.role]}
        </span>
        <button onClick={() => onEdit(user)} className="text-xs text-gray-400 active:text-violet-500">✏️</button>
      </div>
    </div>
  )
}

function CreateUserSheet({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Leader' as User['role'],
  })
  const { mutate, isPending, error } = useCreateUser()

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutate(form, { onSuccess: onClose })
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
      <h2 className="text-xl font-bold text-gray-900">Новий користувач</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
            <input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              required
              className={inputClass}
              placeholder="Іван"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
            <input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              required
              className={inputClass}
              placeholder="Іванов"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
            className={inputClass}
            placeholder="leader@camp.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            required
            minLength={8}
            className={inputClass}
            placeholder="Мінімум 8 символів"
          />
        </div>

        <RoleSelector value={form.role} onChange={(role) => set('role', role)} />

        {error && (
          <p className="text-red-500 text-sm">
            {error instanceof Error ? error.message : 'Помилка створення. Перевірте дані.'}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isPending ? 'Створення...' : 'Створити'}
        </button>
      </form>
    </BottomSheet>
  )
}

function EditUserSheet({ user, onClose }: { user: User; onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusPending, setStatusPending] = useState(false)
  const { mutateAsync: updateUser, isPending } = useUpdateUser(user.id)
  const { mutateAsync: createAvatarUploadUrl, isPending: isUploading } = useCreateUserAvatarUploadUrl()

  // Revoke the object URL whenever it changes or the component unmounts,
  // to avoid leaking blob URLs.
  useEffect(() => {
    if (!avatarPreviewUrl) return
    return () => URL.revokeObjectURL(avatarPreviewUrl)
  }, [avatarPreviewUrl])

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSubmitError('JPEG, PNG або WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Максимум 5 MB'); return }
    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createAvatarUploadUrl({ contentType: avatarFile.type })
        await uploadUserAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      await updateUser({ ...form, ...(photoUrl ? { photoUrl } : {}) })
      onClose()
    } catch {
      setSubmitError('Помилка збереження')
    }
  }

  async function handleToggleActive() {
    const nextActive = !user.isActive
    if (!nextActive) {
      const confirmed = window.confirm(`Деактивувати ${user.firstName} ${user.lastName}?`)
      if (!confirmed) return
    }
    setSubmitError(null)
    setStatusPending(true)
    try {
      await updateUser({ isActive: nextActive })
      onClose()
    } catch {
      setSubmitError('Не вдалося змінити статус користувача')
    } finally {
      setStatusPending(false)
    }
  }

  const displayPhoto = avatarPreviewUrl ?? user.photoUrl
  const busy = isPending || isUploading || statusPending

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
      <p className="text-lg font-bold text-gray-900">Редагувати користувача</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0 overflow-hidden">
              {displayPhoto
                ? <img src={displayPhoto} alt={user.firstName} className="w-full h-full object-cover" />
                : <Initials firstName={user.firstName} lastName={user.lastName} />
              }
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {user.photoUrl || avatarPreviewUrl ? 'Змінити фото' : 'Додати фото'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
            <input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              required
              className={inputClass}
              placeholder="Іван"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
            <input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              required
              className={inputClass}
              placeholder="Іванов"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <RoleSelector value={form.role} onChange={(role) => set('role', role)} />

        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isPending || isUploading ? 'Збереження...' : 'Зберегти'}
        </button>

        <div className="pt-2 border-t border-gray-100">
          {user.isActive ? (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={busy}
              className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold disabled:opacity-50 active:bg-red-50"
            >
              {statusPending ? 'Деактивація...' : 'Деактивувати користувача'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={busy}
              className="w-full py-3 rounded-xl border border-green-200 text-green-700 text-sm font-semibold disabled:opacity-50 active:bg-green-50"
            >
              {statusPending ? 'Активація...' : 'Активувати користувача'}
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  )
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const active = users?.filter((u) => u.isActive) ?? []
  const inactive = users?.filter((u) => !u.isActive) ?? []

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Користувачі</h1>
          <p className="text-sm text-gray-400 mt-0.5">{active.length} активних</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : users?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-medium">Користувачів ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб додати</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((u) => (
            <UserCard key={u.id} user={u} onEdit={setEditingUser} />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-4 mb-2">Деактивовані</p>
              {inactive.map((u) => (
                <UserCard key={u.id} user={u} onEdit={setEditingUser} />
              ))}
            </>
          )}
        </div>
      )}

      {showCreate && <CreateUserSheet onClose={() => setShowCreate(false)} />}
      {editingUser && <EditUserSheet user={editingUser} onClose={() => setEditingUser(null)} />}
    </div>
  )
}