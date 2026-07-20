import { Coins } from 'lucide-react'
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

function getRuleMeta(metadata: Record<string, unknown> | null) {
  if (!metadata) return null
  return {
    rulePhotoUrl: typeof metadata.rulePhotoUrl === 'string' ? metadata.rulePhotoUrl : null,
    ruleDescription: typeof metadata.ruleDescription === 'string' ? metadata.ruleDescription : null,
    isAchievement: metadata.isAchievement === true,
    achievementKey: typeof metadata.achievementKey === 'string' ? metadata.achievementKey : null,
  }
}

export function ChildProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const childId = searchParams.get('childId')
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
          {(() => {
            const unique = new Map<string, { reason: string; photoUrl: string | null; description: string | null }>()
            for (const tx of data.child.transactions) {
              if (tx.amount <= 0) continue
              const meta = getRuleMeta(tx.metadata)
              if (!meta?.isAchievement) continue
              const key = meta.achievementKey ?? tx.reason.toLowerCase()
              if (unique.has(key)) continue
              unique.set(key, {
                reason: tx.reason,
                photoUrl: meta.rulePhotoUrl,
                description: meta.ruleDescription,
              })
            }
            const achievements = Array.from(unique.values())

            if (!achievements.length) return null

            return (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <p className="font-semibold text-gray-900">Ачівки</p>
                <div className="space-y-2">
                  {achievements.map((achievement) => (
                    <div
                      key={`${achievement.reason}-${achievement.photoUrl ?? 'no-photo'}`}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-100 overflow-hidden flex items-center justify-center text-violet-700 flex-shrink-0">
                        {achievement.photoUrl ? (
                          <img src={achievement.photoUrl} alt={achievement.reason} className="w-full h-full object-cover" />
                        ) : (
                          <Coins className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">{achievement.reason}</p>
                        {achievement.description && (
                          <p className="text-xs text-gray-500 mt-1 break-words">{achievement.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

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

          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <p className="font-semibold text-gray-900">Історія транзакцій</p>
            {data.child.transactions.length ? (
              <div className="space-y-2">
                {data.child.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 overflow-hidden flex items-center justify-center text-violet-700 flex-shrink-0">
                        {getRuleMeta(tx.metadata)?.rulePhotoUrl ? (
                          <img
                            src={getRuleMeta(tx.metadata)!.rulePhotoUrl!}
                            alt={tx.reason}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Coins className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">{tx.reason}</p>
                        {getRuleMeta(tx.metadata)?.ruleDescription && (
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            {getRuleMeta(tx.metadata)!.ruleDescription}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{formatTxDate(tx.createdAt)}</p>
                      </div>
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
