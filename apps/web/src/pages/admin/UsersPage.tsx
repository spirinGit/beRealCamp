import { useState } from 'react'
import {
  ROLE_COLORS,
  ROLE_LABELS,
  type User,
  useCreateUser,
  useDeactivateUser,
  useUsers,
} from '../../features/users'

const ROLES: User['role'][] = ['Administrator', 'Leader', 'Worker']

function UserCard({ user, onDeactivate }: { user: User; onDeactivate: (id: string) => void }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${
      !user.isActive ? 'opacity-50' : ''
    }`}>
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
        {user.firstName[0]}{user.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-sm text-gray-400 truncate">{user.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
          {ROLE_LABELS[user.role]}
        </span>
        {user.isActive && (
          <button
            onClick={() => onDeactivate(user.id)}
            className="text-xs text-gray-300 active:text-red-400"
          >
            деакт.
          </button>
        )}
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate(form, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
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
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Іван"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Мінімум 8 символів"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Роль *</label>
            <div className="flex gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => set('role', role)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                    form.role === role
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">Помилка створення. Перевірте дані.</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isPending ? 'Створення...' : 'Створити'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const { mutate: deactivate } = useDeactivateUser()
  const [showCreate, setShowCreate] = useState(false)

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
            <UserCard key={u.id} user={u} onDeactivate={deactivate} />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-4 mb-2">Деактивовані</p>
              {inactive.map((u) => (
                <UserCard key={u.id} user={u} onDeactivate={deactivate} />
              ))}
            </>
          )}
        </div>
      )}

      {showCreate && <CreateUserSheet onClose={() => setShowCreate(false)} />}
    </div>
  )
}

