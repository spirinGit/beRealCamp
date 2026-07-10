import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePublicShop } from '../../features/camps'

export function ShopPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const { data, isLoading, isError } = usePublicShop(code)

  if (!code) {
    return (
      <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 flex items-center">
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-600">
          Посилання неповне. Потрібен код табору.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 max-w-lg mx-auto p-4 space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="text-sm font-medium text-violet-700">
        ← Назад
      </button>

      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-400">На що можна витратити бали</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Активні позиції магазину</h1>
        {data?.camp && <p className="text-sm text-gray-500 mt-1">{data.camp.name}</p>}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)}</div>
      ) : isError || !data ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-red-500">
          Не вдалося завантажити позиції магазину.
        </div>
      ) : data.rewards.length === 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-500">
          Активних позицій поки немає.
        </div>
      ) : (
        <div className="space-y-3">
          {data.rewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-gray-900">{reward.name}</p>
              {reward.description && <p className="text-sm text-gray-500 mt-1">{reward.description}</p>}
              <div className="mt-3 space-y-2">
                {reward.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm font-bold text-violet-700">{item.price} балів</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
