import { useMemo } from 'react'
import { Coins } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { useChildBalance, useChildren } from '../../features/children'
import { type Transaction, useTransactions } from '../../features/transactions'
import { BottomSheet } from '../../shared/ui'

type HistoryTab = 'children' | 'history'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRuleMeta(metadata: Record<string, unknown> | null) {
  if (!metadata) return null
  return {
    rulePhotoUrl: typeof metadata.rulePhotoUrl === 'string' ? metadata.rulePhotoUrl : null,
    ruleDescription: typeof metadata.ruleDescription === 'string' ? metadata.ruleDescription : null,
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function getActorName(tx: Transaction, currentUser: { id: string; firstName: string; lastName: string } | null) {
  const firstName = tx.actorFirstName?.trim() ?? ''
  const lastName = tx.actorLastName?.trim() ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  if (fullName) return fullName

  if (tx.actorUserId && currentUser && tx.actorUserId === currentUser.id) {
    return `${currentUser.firstName} ${currentUser.lastName}`.trim()
  }

  return fullName || 'Система'
}

function TransactionItem({
  tx,
  childName,
  currentUser,
}: {
  tx: Transaction
  childName?: string
  currentUser: { id: string; firstName: string; lastName: string } | null
}) {
  const isEarn = tx.amount > 0
  const ruleMeta = getRuleMeta(tx.metadata)
  const actorName = getActorName(tx, currentUser)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
          isEarn ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        {ruleMeta?.rulePhotoUrl ? (
          <img src={ruleMeta.rulePhotoUrl} alt={tx.reason} className="w-full h-full object-cover" />
        ) : (
          <Coins className="w-4 h-4 text-yellow-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">
          {tx.reason}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Видав(ла): {actorName}</p>
        {childName && <p className="text-xs text-gray-400 mt-0.5">Дитина: {childName}</p>}

        {ruleMeta?.ruleDescription && (
          <p className="text-xs text-gray-400 mt-0.5">{ruleMeta.ruleDescription}</p>
        )}

        {tx.comment && (
          <p className="text-xs text-gray-400 mt-0.5">{tx.comment}</p>
        )}

        <p className="text-xs text-gray-300 mt-0.5">
          {formatDate(tx.createdAt)}
        </p>
      </div>

      <span
        className={`text-sm font-bold flex-shrink-0 ${
          isEarn ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {isEarn ? '+' : ''}
        {tx.amount}
      </span>
    </div>
  )
}

function ChildTransactionsSheet({
  child,
  currentUser,
  onClose,
}: {
  child: {
    id: string
    firstName: string
    lastName: string
    gender: string
    balance: number
  }
  currentUser: { id: string; firstName: string; lastName: string } | null
  onClose: () => void
}) {
  const { data: txs, isLoading } = useTransactions(child.id)

  return (
    <BottomSheet onClose={onClose} className="max-h-[85dvh] flex flex-col">
      <div className="p-6 pb-3 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {child.gender === 'male' ? '👦' : '👧'}
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {child.firstName} {child.lastName}
            </h2>
            <p className="text-sm text-gray-400">
              Баланс:{' '}
              <span className="font-semibold text-violet-600">
                ⭐ {child.balance}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : txs?.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">Транзакцій ще немає</p>
          </div>
        ) : (
          <div>
            {txs?.map((tx) => (
              <TransactionItem
                key={tx.id}
                tx={tx}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

type ChildSummary = {
  id: string
  firstName: string
  lastName: string
  gender: string
  balance: number
}

function ChildRow({
  child,
  onClick,
}: {
  child: {
    id: string
    firstName: string
    lastName: string
    gender: string
  }
  onClick: (childId: string) => void
}) {
  const { data: balance = 0 } = useChildBalance(child.id)

  return (
    <button
      onClick={() => onClick(child.id)}
      className="w-full bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
    >
      <span className="text-2xl">
        {child.gender === 'male' ? '👦' : '👧'}
      </span>

      <div className="flex-1">
        <p className="font-semibold text-gray-900">
          {child.firstName} {child.lastName}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-bold text-violet-600">
          ⭐ {balance}
        </p>

        <p className="text-xs text-gray-300">
          коіни
        </p>
      </div>
    </button>
  )
}

export function ChildHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { data: children, isLoading: childrenLoading } = useChildren()
  const { data: allTransactions = [], isLoading: txLoading } = useTransactions()
  const selectedChildId = searchParams.get('childId')
  const activeTab: HistoryTab = searchParams.get('tab') === 'history' ? 'history' : 'children'
  const searchQuery = searchParams.get('q') ?? ''
  const { data: selectedBalance = 0 } = useChildBalance(selectedChildId ?? '')
  const selected = useMemo<ChildSummary | null>(() => {
    if (!selectedChildId) return null
    const child = children?.find((item) => item.id === selectedChildId)
    if (!child) return null
    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      balance: selectedBalance,
    }
  }, [children, selectedBalance, selectedChildId])

  const childrenList = children ?? []
  const childrenById = useMemo(
    () => new Map(childrenList.map((child) => [child.id, `${child.firstName} ${child.lastName}`])),
    [childrenList],
  )

  const filteredChildren = useMemo(() => {
    const normalizedQuery = normalize(searchQuery)
    if (!normalizedQuery) return childrenList

    return childrenList.filter((child) =>
      normalize(`${child.firstName} ${child.lastName}`).includes(normalizedQuery),
    )
  }, [childrenList, searchQuery])

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = normalize(searchQuery)
    if (!normalizedQuery) return allTransactions

    return allTransactions.filter((tx) => {
      const childName = childrenById.get(tx.childId)
      return !!childName && normalize(childName).includes(normalizedQuery)
    })
  }, [allTransactions, childrenById, searchQuery])

  function setTab(tab: HistoryTab) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', tab)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: true })
  }

  function updateSearch(value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value.trim().length > 0) {
      nextParams.set('q', value)
    } else {
      nextParams.delete('q')
    }
    setSearchParams(nextParams, { replace: true })
  }

  function openChildSheet(childId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('childId', childId)
    setSearchParams(nextParams, { replace: Boolean(selectedChildId) })
  }

  function closeChildSheet() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Діти
        </h1>

        <p className="text-sm text-gray-400 mt-0.5">
          Баланси і транзакції
        </p>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
        <button
          onClick={() => setTab('children')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
            activeTab === 'children' ? 'bg-white text-blue-700' : 'text-gray-500'
          }`}
        >
          Діти
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
            activeTab === 'history' ? 'bg-white text-blue-700' : 'text-gray-500'
          }`}
        >
          Історія
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Пошук дитини..."
            autoComplete="off"
          />
        </div>
      </div>

      {activeTab === 'children' ? (
        childrenLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-16 animate-pulse"
              />
            ))}
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👧</p>
            <p className="font-medium">
              Нічого не знайдено
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChildren.map((child) => (
              <ChildRow
                key={child.id}
                child={child}
                onClick={openChildSheet}
              />
            ))}
          </div>
        )
      ) : txLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">
            Транзакцій не знайдено
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl px-4">
          {filteredTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              tx={tx}
              childName={childrenById.get(tx.childId) ?? 'Невідома дитина'}
              currentUser={user}
            />
          ))}
        </div>
      )}

      {selected && (
        <ChildTransactionsSheet
          child={selected}
          currentUser={user}
          onClose={closeChildSheet}
        />
      )}
    </div>
  )
}