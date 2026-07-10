import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePublicChildProfile } from '../../features/camps'

function formatTxDate(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChildProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const childId = searchParams.get('childId')
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false)
  const { data, isLoading, isError } = usePublicChildProfile(code, childId)

  if (!code || !childId) {
    return (
      <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 flex items-center">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-600">
          Посилання на профіль неповне.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-violet-700"
      >
        ← Назад
      </button>

      {isLoading ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm animate-pulse h-72" />
      ) : isError || !data?.child ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-red-500">
          Не вдалося відкрити профіль дитини.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="w-24 h-24 rounded-full bg-violet-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-violet-700 mx-auto">
              {data.child.photoUrl ? (
                <img
                  src={data.child.photoUrl}
                  alt={`${data.child.firstName} ${data.child.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                `${data.child.firstName[0] ?? ''}${data.child.lastName[0] ?? ''}`
              )}
            </div>

            <p className="text-xs uppercase tracking-wide text-gray-400 mt-5">{data.camp.name}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {data.child.firstName} {data.child.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{data.child.squadName}</p>
          </div>

          <div className="bg-violet-600 rounded-3xl p-6 text-white shadow-sm">
            <p className="text-sm text-violet-100">Поточний баланс</p>
            <p className="text-5xl font-bold mt-2">{data.child.balance}</p>
            <p className="text-sm text-violet-100 mt-2">балів у таборі</p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/child/shop?code=${code}`)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
          >
            <p className="font-semibold text-gray-900">🛍️ На що витратити бали</p>
            <p className="text-sm text-gray-500 mt-1">Переглянути всі активні позиції магазину</p>
          </button>

          {data.camp.childGuidelines && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <p className="font-semibold text-gray-900">Загальні положення табору</p>
                <span className="text-sm text-violet-700 font-medium">
                  {isGuidelinesOpen ? 'Згорнути' : 'Відкрити'}
                </span>
              </button>
              {isGuidelinesOpen && (
                <p className="text-sm text-gray-700 whitespace-pre-line mt-2">{data.camp.childGuidelines}</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <p className="font-semibold text-gray-900">Історія транзакцій</p>
            {data.child.transactions.length ? (
              <div className="space-y-2">
                {data.child.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">{tx.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTxDate(tx.createdAt)}</p>
                    </div>
                    <p
                      className={`text-sm font-bold whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Транзакцій поки немає.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="font-semibold text-gray-900">Що видно тут</p>
            <p className="text-sm text-gray-500 mt-2">
              Тільки ім&apos;я, загін і бали. Службові дані, телефони батьків та примітки приховані.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
