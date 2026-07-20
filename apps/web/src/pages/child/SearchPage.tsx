import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  usePublicCamp,
  usePublicChildSearch,
  usePublicSquadChildren,
} from '../../features/camps'
import { PhotoViewer } from '../../shared/ui'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function ChildCard({
  firstName,
  lastName,
  balance,
  subtitle,
  onClick,
}: {
  firstName: string
  lastName: string
  balance: number
  subtitle?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
    >
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-lg font-semibold text-violet-700 shrink-0">
          {`${firstName[0] ?? ''}${lastName[0] ?? ''}`}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {firstName} {lastName}
        </p>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-400">Бали</p>
        <p className="font-bold text-violet-700">{balance}</p>
      </div>
    </button>
  )
}

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const code = searchParams.get('code')
  const [query, setQuery] = useState('')
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    searchParams.get('squadId'),
  )
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false)
  const [activePhoto, setActivePhoto] = useState<{ src: string; alt: string } | null>(null)
  const trimmedQuery = query.trim()
  const isSearchMode = trimmedQuery.length >= 2

  const {
    data: publicCamp,
    isLoading: isLoadingCamp,
    isError: isCampError,
  } = usePublicCamp(code)

  const { data: squadChildren, isLoading: isLoadingChildren } = usePublicSquadChildren(
    code,
    isSearchMode ? null : selectedSquadId,
  )

  const { data: searchResults, isFetching: isSearching } = usePublicChildSearch(code, query)

  useEffect(() => {
    if (!selectedSquadId && publicCamp?.squads.length) {
      setSelectedSquadId(publicCamp.squads[0].id)
    }
  }, [publicCamp?.squads, selectedSquadId])

  useEffect(() => {
    if (!selectedSquadId) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('squadId', selectedSquadId)
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, selectedSquadId, setSearchParams])

  const selectedSquad = useMemo(
    () => publicCamp?.squads.find((squad) => squad.id === selectedSquadId) ?? null,
    [publicCamp?.squads, selectedSquadId],
  )

  const selectedSquadLeaders = selectedSquad?.leaders ?? []

  function openChild(childId: string) {
    navigate(`/child/profile?code=${code}&childId=${childId}`)
  }

  if (!code) {
    return (
      <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 flex items-center">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-600">
          Посилання неповне. Попросіть адміністратора згенерувати правильний URL для дітей.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 space-y-4">
      {activePhoto && (
        <PhotoViewer
          src={activePhoto.src}
          alt={activePhoto.alt}
          onClose={() => setActivePhoto(null)}
        />
      )}

      <div className="bg-white rounded-3xl p-5 shadow-sm">
        {isLoadingCamp ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 w-40 rounded bg-gray-100" />
            <div className="h-4 w-28 rounded bg-gray-100" />
          </div>
        ) : isCampError || !publicCamp ? (
          <div className="text-sm text-red-500">Табір не знайдено або посилання вже неактивне.</div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-gray-400">Поточний табір</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{publicCamp.camp.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(publicCamp.camp.startDate)} - {formatDate(publicCamp.camp.endDate)}
            </p>
          </>
        )}
      </div>

      {publicCamp && (
        <>
          <button
            type="button"
            onClick={() => navigate(`/child/shop?code=${code}`)}
            className="w-full bg-violet-600 text-white rounded-2xl px-4 py-3 font-semibold text-left shadow-sm"
          >
            🛍️ Переглянути активні позиції магазину
          </button>

          {publicCamp.camp.childGuidelines && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <p className="text-xs uppercase tracking-wide text-gray-400">Загальні положення</p>
                <span className="text-sm text-violet-700 font-medium">
                  {isGuidelinesOpen ? 'Згорнути' : 'Відкрити'}
                </span>
              </button>
              {isGuidelinesOpen && (
                <p className="text-sm text-gray-700 whitespace-pre-line mt-2">
                  {publicCamp.camp.childGuidelines}
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <p className="font-semibold text-gray-900">Знайти себе</p>
              <p className="text-sm text-gray-500">Можна шукати по імені або прізвищу</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Почніть вводити ім'я..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Загони</h2>
              <span className="text-sm text-gray-400">{publicCamp.squads.length}</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {publicCamp.squads.map((squad) => {
                const isSelected = squad.id === selectedSquadId
                return (
                  <button
                    key={squad.id}
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setSelectedSquadId(squad.id)
                    }}
                    className={`min-w-fit rounded-2xl px-4 py-3 border text-left ${
                      isSelected
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <p className="font-semibold whitespace-nowrap">{squad.name}</p>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-violet-100' : 'text-gray-400'}`}>
                      {squad.childCount} дітей
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {isSearchMode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Результати пошуку</h2>
                {isSearching && <span className="text-sm text-gray-400">Пошук...</span>}
              </div>

              {searchResults?.children.length ? (
                <div className="space-y-3">
                  {searchResults.children.map((child) => (
                    <ChildCard
                      key={child.id}
                      firstName={child.firstName}
                      lastName={child.lastName}
                      balance={child.balance}
                      subtitle={child.squadName}
                      onClick={() => openChild(child.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-500">
                  {query.trim().length < 2 ? 'Введіть хоча б 2 символи.' : 'Нічого не знайдено.'}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedSquad?.name ?? 'Оберіть загін'}
                  </h2>
                </div>
                {isLoadingChildren && <span className="text-sm text-gray-400">Завантаження...</span>}
              </div>

              {selectedSquad && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSquad.photoUrl) return
                        setActivePhoto({ src: selectedSquad.photoUrl, alt: selectedSquad.name })
                      }}
                      className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 ring-1 ring-gray-100 disabled:cursor-default"
                      style={{ backgroundColor: selectedSquad.color }}
                      disabled={!selectedSquad.photoUrl}
                      aria-label={`Збільшити фото загону ${selectedSquad.name}`}
                    >
                      {selectedSquad.photoUrl ? (
                        <img
                          src={selectedSquad.photoUrl}
                          alt={selectedSquad.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Фото загону</p>
                      <p className="font-semibold text-gray-900 truncate">{selectedSquad.name}</p>
                      <p className="text-sm text-gray-500">{selectedSquad.childCount} дітей</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Лідери загону</p>
                    {selectedSquadLeaders.length ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSquadLeaders.map((leader) => (
                          <div
                            key={leader.id}
                            className="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 border border-gray-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (!leader.photoUrl) return
                                setActivePhoto({
                                  src: leader.photoUrl,
                                  alt: `${leader.firstName} ${leader.lastName}`,
                                })
                              }}
                              className="w-8 h-8 rounded-full bg-violet-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-violet-700 shrink-0 disabled:cursor-default"
                              disabled={!leader.photoUrl}
                              aria-label={`Збільшити фото лідера ${leader.firstName} ${leader.lastName}`}
                            >
                              {leader.photoUrl ? (
                                <img
                                  src={leader.photoUrl}
                                  alt={`${leader.firstName} ${leader.lastName}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                `${leader.firstName[0] ?? ''}${leader.lastName[0] ?? ''}`
                              )}
                            </button>
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {leader.firstName} {leader.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Поки немає призначених лідерів.</p>
                    )}
                  </div>

                  {selectedSquad.description && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Опис загону</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{selectedSquad.description}</p>
                    </div>
                  )}
                </div>
              )}

              {squadChildren?.children.length ? (
                <div className="space-y-3">
                  {squadChildren.children.map((child) => (
                    <ChildCard
                      key={child.id}
                      firstName={child.firstName}
                      lastName={child.lastName}
                      balance={child.balance}
                      onClick={() => openChild(child.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-500">
                  У цьому загоні поки немає дітей.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
