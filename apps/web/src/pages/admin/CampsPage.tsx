import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { type Camp, useArchiveCamp, useCamps, useCreateCamp, useUpdateCamp } from '../../features/camps'
import { BottomSheet } from '../../shared/ui'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function CreateCampSheet({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error } = useCreateCamp()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canSubmit = name.trim().length > 0 && !!startDate && !!endDate

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    mutate(
      {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Новий табір</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            placeholder="Назва табору"
          />

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-600">Початок проведення</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-600">Кінець проведення</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
            />
          </div>

          {error && <p className="text-sm text-red-500">Помилка створення табору</p>}

          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isPending ? 'Створення...' : 'Створити табір'}
          </button>
        </form>
    </BottomSheet>
  )
}

function EditCampSheet({
  camp,
  isActiveCamp,
  onArchived,
  onClose,
}: {
  camp: Camp
  isActiveCamp: boolean
  onArchived: () => void
  onClose: () => void
}) {
  const { mutate, isPending, error } = useUpdateCamp(camp.id)
  const { mutate: archiveCamp, isPending: isArchiving } = useArchiveCamp(camp.id)
  const [name, setName] = useState(camp.name)
  const [startDate, setStartDate] = useState(camp.startDate.slice(0, 10))
  const [endDate, setEndDate] = useState(camp.endDate ? camp.endDate.slice(0, 10) : '')

  const canSubmit = name.trim().length > 0 && !!startDate && !!endDate

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    mutate(
      {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      },
      { onSuccess: onClose },
    )
  }

  function handleArchive() {
    archiveCamp(undefined, {
      onSuccess: () => {
        onArchived()
        onClose()
      },
    })
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Редагувати табір</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            placeholder="Назва табору"
          />

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-600">Початок проведення</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-600">Кінець проведення</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
            />
          </div>

          {error && <p className="text-sm text-red-500">Помилка оновлення табору</p>}

          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isPending ? 'Збереження...' : 'Зберегти зміни'}
          </button>

          {camp.status === 'active' && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving}
              className="w-full bg-red-50 text-red-600 font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {isArchiving
                ? 'Архівація...'
                : isActiveCamp
                  ? 'Архівувати табір і вийти з нього'
                  : 'Архівувати табір'}
            </button>
          )}
        </form>
    </BottomSheet>
  )
}

export function CampsPage() {
  const navigate = useNavigate()
  const { activeCampId, setActiveCampId } = useAuth()
  const { data: camps = [], isLoading } = useCamps()
  const [showCreate, setShowCreate] = useState(false)
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null)

  const sortedCamps = useMemo(
    () =>
      [...camps].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [camps],
  )

  function openCamp(campId: string) {
    setActiveCampId(campId)
    navigate('/admin/dashboard')
  }

  function handleArchivedCamp(campId: string) {
    if (activeCampId === campId) {
      setActiveCampId(null)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Табори</h1>
          <p className="text-sm text-gray-400 mt-0.5">Оберіть табір для роботи</p>
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
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : sortedCamps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⛺</p>
          <p className="font-medium">Таборів ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб створити перший табір</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCamps.map((camp) => {
            const isSelected = activeCampId === camp.id
            return (
              <button
                key={camp.id}
                onClick={() => openCamp(camp.id)}
                className={`w-full rounded-2xl p-4 shadow-sm text-left border ${
                  isSelected ? 'bg-violet-50 border-violet-300' : 'bg-white border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{camp.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCamp(camp)
                      }}
                      className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium"
                    >
                      Редагувати
                    </button>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        camp.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {camp.status === 'active' ? 'Активний' : 'Архів'}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && <CreateCampSheet onClose={() => setShowCreate(false)} />}
      {editingCamp && (
        <EditCampSheet
          camp={editingCamp}
          isActiveCamp={activeCampId === editingCamp.id}
          onArchived={() => handleArchivedCamp(editingCamp.id)}
          onClose={() => setEditingCamp(null)}
        />
      )}
    </div>
  )
}
