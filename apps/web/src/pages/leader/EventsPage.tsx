import { useMemo, useState } from 'react'
import { useLeaderEvents, useSubmitEventCode, type LeaderEventRow } from '../../features/events'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LeaderEventsPage() {
  const [view, setView] = useState<'active' | 'history'>('active')
  const { data: rows = [] } = useLeaderEvents(view)

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Події</h1>
        <p className="text-sm text-gray-400">Активні та завершені події ваших загонів</p>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setView('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${view === 'active' ? 'bg-white text-blue-700' : 'text-gray-500'}`}
        >
          Активні
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${view === 'history' ? 'bg-white text-blue-700' : 'text-gray-500'}`}
        >
          Історія
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <LeaderEventCard key={`${row.eventId}-${row.squadId}`} row={row} isHistory={view === 'history'} />
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-gray-400">{view === 'active' ? 'Немає активних подій.' : 'Історія подій порожня.'}</p>
        )}
      </div>
    </div>
  )
}

function LeaderEventCard({ row, isHistory }: { row: LeaderEventRow; isHistory: boolean }) {
  const [code, setCode] = useState('')
  const { mutate, isPending } = useSubmitEventCode()

  const canSubmit = useMemo(() => code.trim().length > 0 && row.status === 'pending', [code, row.status])

  const statusText =
    row.status === 'pending' ? 'Очікує' : row.status === 'completed' ? 'Виконано' : 'Невиконано'

  function handleSubmit() {
    if (!canSubmit) return
    mutate({ eventId: row.eventId, squadId: row.squadId, code: code.trim() }, { onSuccess: () => setCode('') })
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{row.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{row.squadName}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${row.status === 'completed' ? 'bg-green-100 text-green-700' : row.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
        >
          {statusText}
        </span>
      </div>

      {row.description && <p className="text-sm text-gray-600">{row.description}</p>}

      <p className="text-xs text-gray-400">До: {formatDateTime(row.endsAt)}</p>
      <p className="text-xs text-gray-500">+{row.rewardPoints} / -{row.penaltyPoints} ⭐</p>

      {!isHistory && row.status === 'pending' && (
        <div className="pt-1 space-y-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200"
            placeholder="Введіть код події"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
          >
            {isPending ? 'Перевірка...' : 'Підтвердити виконання'}
          </button>
        </div>
      )}
    </div>
  )
}
