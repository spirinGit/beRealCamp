import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSquads } from '../../features/squads'

export function LeaderSchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: squads = [], isLoading } = useSquads()
  const selectedSquadId = searchParams.get('squadId')

  const selectedSquad = useMemo(() => {
    if (selectedSquadId) {
      const found = squads.find((squad) => squad.id === selectedSquadId)
      if (found) return found
    }
    return squads[0] ?? null
  }, [selectedSquadId, squads])

  function selectSquad(squadId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('squadId', squadId)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Розклад</h1>
        <p className="text-sm text-gray-400 mt-0.5">Розклад вашого загону</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      ) : squads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="font-medium">У вас ще немає загонів</p>
        </div>
      ) : (
        <div className="space-y-3">
          {squads.length > 1 ? (
            <>
              <label className="block text-sm font-medium text-gray-700">Оберіть загін</label>
              <select
                value={selectedSquad?.id ?? ''}
                onChange={(e) => selectSquad(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400">Загін</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedSquad?.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст розкладу</label>
            <textarea
              value={selectedSquad?.schedule ?? ''}
              readOnly
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-base min-h-72"
              placeholder="Адмін ще не заповнив розклад для цього загону"
            />
          </div>
        </div>
      )}
    </div>
  )
}