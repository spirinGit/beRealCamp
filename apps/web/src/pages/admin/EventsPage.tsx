import { useMemo, useState } from 'react'
import { useAdminEvents, useCreateEvent, useEventDetails, useUpdateEventParticipant } from '../../features/events'
import { useSquads } from '../../features/squads'
import { BottomSheet } from '../../shared/ui'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isEventActive(endsAt: string) {
  return new Date(endsAt).getTime() >= Date.now()
}

export function EventsPage() {
  const [view, setView] = useState<'active' | 'history'>('active')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const { data: events = [] } = useAdminEvents(view)
  const { data: details } = useEventDetails(selectedEventId ?? undefined)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Події</h1>
          <p className="text-sm text-gray-400">Створення, контроль та історія</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold"
        >
          Створити
        </button>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setView('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${view === 'active' ? 'bg-white text-violet-700' : 'text-gray-500'}`}
        >
          Активні
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${view === 'history' ? 'bg-white text-violet-700' : 'text-gray-500'}`}
        >
          Історія
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => setSelectedEventId(event.id)}
            className="w-full rounded-2xl bg-white p-4 text-left shadow-sm"
          >
            <p className="font-semibold text-gray-900">{event.title}</p>
            {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
            <p className="text-xs text-gray-400 mt-2">До: {formatDateTime(event.endsAt)}</p>
            <p className="text-xs text-gray-500 mt-1">
              +{event.rewardPoints} / -{event.penaltyPoints} ⭐
            </p>
            {isEventActive(event.endsAt) && (
              <p className="text-xs text-violet-600 mt-1">Код: {event.code}</p>
            )}
          </button>
        ))}
        {events.length === 0 && <p className="text-sm text-gray-400">Подій у цьому розділі ще немає.</p>}
      </div>

      {isCreateOpen && <CreateEventSheet onClose={() => setIsCreateOpen(false)} />}
      {selectedEventId && details && (
        <EventDetailsSheet event={details} onClose={() => setSelectedEventId(null)} />
      )}
    </div>
  )
}

function CreateEventSheet({ onClose }: { onClose: () => void }) {
  const { data: squads = [] } = useSquads()
  const { mutate, isPending } = useCreateEvent()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [rewardPoints, setRewardPoints] = useState('10')
  const [penaltyPoints, setPenaltyPoints] = useState('5')
  const [endsAt, setEndsAt] = useState('')
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([])

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      code.trim().length > 0 &&
      Number(rewardPoints) > 0 &&
      Number(penaltyPoints) >= 0 &&
      endsAt &&
      selectedSquadIds.length > 0
    )
  }, [title, code, rewardPoints, penaltyPoints, endsAt, selectedSquadIds])

  function toggleSquad(id: string) {
    setSelectedSquadIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  function handleSubmit() {
    if (!canSubmit) return
    mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        code: code.trim(),
        rewardPoints: Number(rewardPoints),
        penaltyPoints: Number(penaltyPoints),
        endsAt: new Date(endsAt).toISOString(),
        squadIds: selectedSquadIds,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8 space-y-3">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Створення події</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Назва" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 min-h-20" placeholder="Опис" />
        <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Код події" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-600">Нагорода за щось</p>
          <input type="number" min="1" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Скільки балів нарахувати" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-600">Штраф за щось</p>
          <input type="number" min="0" value={penaltyPoints} onChange={(e) => setPenaltyPoints(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Скільки балів зняти" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-600">Виконати до</p>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-gray-700">Загони-учасники</p>
          <div className="grid grid-cols-1 gap-2">
            {squads.map((squad) => (
              <button
                key={squad.id}
                type="button"
                onClick={() => toggleSquad(squad.id)}
                className={`px-3 py-2 rounded-lg border text-left ${selectedSquadIds.includes(squad.id) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                {squad.name}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {isPending ? 'Створення...' : 'Створити подію'}
        </button>
    </BottomSheet>
  )
}

function EventDetailsSheet({
  event,
  onClose,
}: {
  event: {
    id: string
    title: string
    description: string | null
    code: string
    rewardPoints: number
    penaltyPoints: number
    endsAt: string
    participants: Array<{
      squadId: string
      squadName: string
      status: 'pending' | 'completed' | 'failed'
      resolvedAt: string | null
      resolutionSource: 'admin' | 'leader_code' | 'timeout' | null
    }>
  }
  onClose: () => void
}) {
  const { mutate, isPending } = useUpdateEventParticipant(event.id)

  return (
  <BottomSheet
    onClose={onClose}
    zIndex="z-30"
    className="max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8"
  >
    <div>
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

      <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>

      {event.description && (
        <p className="text-sm text-gray-500 mt-1">{event.description}</p>
      )}

      <p className="text-xs text-gray-400 mt-2">
        До: {formatDateTime(event.endsAt)}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        +{event.rewardPoints} / -{event.penaltyPoints} ⭐
      </p>

      {isEventActive(event.endsAt) && (
        <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2">
          <p className="text-xs text-violet-500">Код події</p>
          <p className="font-semibold text-violet-700">{event.code}</p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {event.participants.map((participant) => (
          <div
            key={participant.squadId}
            className="rounded-xl border border-gray-200 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {participant.squadName}
                </p>

                <p className="text-xs text-gray-500">
                  {participant.status === 'pending'
                    ? 'Очікує виконання'
                    : participant.status === 'completed'
                      ? 'Виконано'
                      : 'Невиконано'}
                </p>
              </div>

              {participant.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      mutate({
                        squadId: participant.squadId,
                        status: 'completed',
                      })
                    }
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-semibold"
                  >
                    Виконав
                  </button>

                  <button
                    onClick={() =>
                      mutate({
                        squadId: participant.squadId,
                        status: 'failed',
                      })
                    }
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-semibold"
                  >
                    Не виконав
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">
                  {participant.resolutionSource ?? '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </BottomSheet>
)
}
