import { useState } from 'react'
import { type Child, useChildren, useCreateChild } from '../../features/children'
import { useSquads } from '../../features/squads'

function genderLabel(g: Child['gender']) {
  return g === 'male' ? '👦' : '👧'
}

function ChildCard({ child, squads }: { child: Child; squads?: { id: string; name: string; color: string }[] }) {
  const squad = squads?.find((s) => s.id === child.squadId)
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
        {genderLabel(child.gender)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{child.firstName} {child.lastName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {squad && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: squad.color }} />
              {squad.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateChildSheet({
  onClose,
  squads,
}: {
  onClose: () => void
  squads: { id: string; name: string; color: string }[]
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    squadId: squads[0]?.id ?? '',
    dateOfBirth: '',
    gender: 'male' as Child['gender'],
    parentPhone: '',
    medicalNotes: '',
  })
  const { mutate, isPending, error } = useCreateChild()

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate(
      { ...form, medicalNotes: form.medicalNotes || undefined },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Нова дитина</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Іван" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Іваненко" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Загін *</label>
            <select value={form.squadId} onChange={(e) => set('squadId', e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              {squads.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Стать *</label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                    form.gender === g ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  {g === 'male' ? '👦 Хлопець' : '👧 Дівчина'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата народження *</label>
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон батьків *</label>
            <input type="tel" value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="+380..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Медичні примітки</label>
            <input value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Алергії, особливості..." />
          </div>

          {error && <p className="text-red-500 text-sm">Помилка. Перевірте дані.</p>}

          <button type="submit" disabled={isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
            {isPending ? 'Збереження...' : 'Зареєструвати'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ChildrenPage() {
  const { data: children, isLoading } = useChildren()
  const { data: squads } = useSquads()
  const [showCreate, setShowCreate] = useState(false)
  const [filterSquad, setFilterSquad] = useState<string>('')

  const filtered = filterSquad ? children?.filter((c) => c.squadId === filterSquad) : children

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Діти</h1>
          <p className="text-sm text-gray-400 mt-0.5">{children?.length ?? 0} зареєстровано</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {/* Фільтр по загону */}
      {squads && squads.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          <button onClick={() => setFilterSquad('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !filterSquad ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500'
            }`}>
            Всі
          </button>
          {squads.map((s) => (
            <button key={s.id} onClick={() => setFilterSquad(s.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filterSquad === s.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'
              }`}
              style={filterSquad === s.id ? { backgroundColor: s.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterSquad === s.id ? 'white' : s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👧</p>
          <p className="font-medium">Дітей ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб зареєструвати</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((child) => (
            <ChildCard key={child.id} child={child} squads={squads} />
          ))}
        </div>
      )}

      {showCreate && squads && squads.length > 0 && (
        <CreateChildSheet onClose={() => setShowCreate(false)} squads={squads} />
      )}
      {showCreate && (!squads || squads.length === 0) && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold mb-2">Спочатку створіть загони</p>
            <p className="text-sm text-gray-400">Дитина повинна належати до загону</p>
          </div>
        </div>
      )}
    </div>
  )
}


