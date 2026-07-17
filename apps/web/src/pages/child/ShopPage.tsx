import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePublicShop } from '../../features/camps'
import { Coins } from 'lucide-react'

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
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-violet-700"
      >
        ← Назад
      </button>

      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          На що можна витратити бали
        </p>

        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Активні позиції магазину
        </h1>

        {data?.camp && (
          <p className="text-sm text-gray-500 mt-1">{data.camp.name}</p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-red-500">
          Не вдалося завантажити позиції магазину.
        </div>
      ) : data.rewards.length === 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-500">
          Активних позицій поки немає.
        </div>
      ) : (
        <div className="space-y-4">
          {data.rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {reward.photoUrl ? (
                      <img
                        src={reward.photoUrl}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🎁</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {reward.name}
                    </h2>

                    {reward.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {reward.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {reward.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">🏷️</span>
                          )}
                        </div>

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-violet-700 font-bold">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        {item.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}