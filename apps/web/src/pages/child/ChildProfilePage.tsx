import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Coins } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePublicChildProfile, useRedeemPublicPromoCode } from '../../features/camps'
import { BottomSheet } from '../../shared/ui'

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

function getAchievementDedupKey(reason: string, metadata: Record<string, unknown> | null) {
  const meta = getRuleMeta(metadata)
  if (meta?.achievementKey) return meta.achievementKey.trim().toLowerCase()
  return reason.trim().toLowerCase()
}

export function ChildProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const childId = searchParams.get('childId')
  const { data, isLoading, isError } = usePublicChildProfile(code, childId)
  const { mutate, isPending } = useRedeemPublicPromoCode(code, childId)
  const [isPromoOpen, setIsPromoOpen] = useState(false)
  const [promoCodeValue, setPromoCodeValue] = useState('')
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [openedAchievementKey, setOpenedAchievementKey] = useState<string | null>(null)
  const [achievementTapCount, setAchievementTapCount] = useState<Record<string, number>>({})

  const achievements = (() => {
    if (!data?.child) return [] as Array<{ key: string; reason: string; photoUrl: string | null; description: string | null }>

    const unique = new Map<string, { key: string; reason: string; photoUrl: string | null; description: string | null }>()
    for (const tx of data.child.transactions) {
      if (tx.amount <= 0) continue
      const meta = getRuleMeta(tx.metadata)
      if (!meta?.isAchievement) continue
      const key = getAchievementDedupKey(tx.reason, tx.metadata)
      if (unique.has(key)) continue
      unique.set(key, {
        key,
        reason: tx.reason,
        photoUrl: meta.rulePhotoUrl,
        description: meta.ruleDescription,
      })
    }

    return Array.from(unique.values())
  })()

  function handleRedeemPromoCode() {
    const normalized = promoCodeValue.trim().toUpperCase()
    if (!normalized) {
      setPromoError('Введи код')
      return
    }

    setPromoError(null)
    setPromoMessage(null)
    mutate(normalized, {
      onSuccess: (result) => {
        setPromoCodeValue('')
        setPromoMessage(`Код активовано! +${result.pointsAwarded} балів`)
      },
      onError: (error: any) => {
        const backendError = error?.response?.data?.error
        if (backendError === 'Code already activated') {
          setPromoError('Цей код вже використано')
          return
        }
        if (backendError === 'Code not found') {
          setPromoError('Код не знайдено')
          return
        }
        setPromoError('Не вдалося активувати код')
      },
    })
  }

  function playAchievementAnimation(key: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    const target = event.currentTarget
    const card = target.closest('[data-achievement-card]') as HTMLElement | null
    const nextTap = (achievementTapCount[key] ?? 0) + 1
    setAchievementTapCount((current) => ({ ...current, [key]: nextTap }))

    if (card) {
      const sparkCount = nextTap % 5 === 0 ? 12 : 8
      for (let i = 0; i < sparkCount; i += 1) {
        const spark = document.createElement('span')
        const angle = (Math.PI * 2 * i) / sparkCount
        const distance = (nextTap % 5 === 0 ? 44 : 30) + Math.random() * 8
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance

        spark.style.position = 'absolute'
        spark.style.left = '2.25rem'
        spark.style.top = '2.25rem'
        spark.style.width = '0.36rem'
        spark.style.height = '0.36rem'
        spark.style.borderRadius = '9999px'
        spark.style.pointerEvents = 'none'
        spark.style.zIndex = '30'
        spark.style.background = i % 2 === 0 ? '#fbbf24' : '#fde68a'

        card.appendChild(spark)

        const animation = spark.animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
          ],
          { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        )

        animation.onfinish = () => {
          spark.remove()
        }
      }

      card.animate(
        [
          { boxShadow: '0 4px 16px rgba(180,83,9,0.08)' },
          { boxShadow: '0 10px 22px rgba(251,191,36,0.42)' },
          { boxShadow: '0 4px 16px rgba(180,83,9,0.08)' },
        ],
        { duration: 520, easing: 'ease-out' },
      )
    }

    if (nextTap % 5 === 0) {
      target.animate(
        [
          { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
          { transform: 'translate3d(16px, -18px, 0) rotate(14deg) scale(1.12)' },
          { transform: 'translate3d(-10px, -10px, 0) rotate(-8deg) scale(1.08)' },
          { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
        ],
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      )
      return
    }

    if (nextTap % 2 === 0) {
      target.animate(
        [
          { transform: 'rotate(0deg) scale(1)' },
          { transform: 'rotate(-12deg) scale(1.08)' },
          { transform: 'rotate(10deg) scale(1.08)' },
          { transform: 'rotate(-6deg) scale(1.04)' },
          { transform: 'rotate(0deg) scale(1)' },
        ],
        { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      )
      return
    }

    if (nextTap % 3 === 0) {
      target.animate(
        [
          { transform: 'rotate(0deg) scale(1)' },
          { transform: 'rotate(180deg) scale(1.08)' },
          { transform: 'rotate(360deg) scale(1)' },
        ],
        { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      )
      return
    }

    target.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-7px) scale(1.08)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 280, easing: 'ease-out' },
    )
  }

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
            onClick={() => {
              setIsPromoOpen(true)
              setPromoMessage(null)
              setPromoError(null)
            }}
            className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">🎁 Активувати бонус-код</p>
                <p className="text-sm text-violet-100 mt-1">Введи код і отримай додаткові бали</p>
              </div>
              <span className="text-white text-xl">›</span>
            </div>
          </button>

          <section className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 p-5 shadow-sm">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-200/35" />
            <div className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full bg-orange-200/35" />

            <div className="relative space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-amber-900">Полиця ачівок</p>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                  {achievements.length} шт.
                </span>
              </div>

              <div className="h-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300" />

              {achievements.length ? (
                <div className={
                  achievements.length > 2
                    ? 'flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                    : 'grid grid-cols-2 gap-3'
                }>
                  {achievements.map((achievement) => (
                    <div
                      data-achievement-card
                      key={achievement.key}
                      onClick={() => setOpenedAchievementKey((current) => current === achievement.key ? null : achievement.key)}
                      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setOpenedAchievementKey((current) => current === achievement.key ? null : achievement.key)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`relative rounded-2xl border border-amber-200 bg-white/90 p-3 shadow-[0_4px_16px_rgba(180,83,9,0.08)] text-left transition-all ${
                        achievements.length > 2 ? 'snap-start shrink-0 basis-[calc(50%-0.375rem)]' : ''
                      } ${openedAchievementKey === achievement.key ? 'ring-2 ring-amber-300' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={(event) => playAchievementAnimation(achievement.key, event)}
                        className="w-12 h-12 rounded-xl bg-amber-100 overflow-hidden flex items-center justify-center text-amber-700 active:scale-95 transition-transform"
                        aria-label="Анімація медальки"
                      >
                        {achievement.photoUrl ? (
                          <img src={achievement.photoUrl} alt={achievement.reason} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Coins className="w-5 h-5 text-amber-600" />
                        )}
                      </button>
                      <p className="text-sm font-semibold text-amber-950 mt-2 break-words">{achievement.reason}</p>
                      {openedAchievementKey === achievement.key && achievement.description && (
                        <div className="absolute inset-x-2 bottom-2 z-20 pointer-events-none">
                          <div className="relative rounded-xl border border-amber-300/90 bg-gradient-to-b from-yellow-200 via-amber-200 to-amber-300 px-2.5 py-2 text-xs font-semibold text-amber-950 shadow-[0_10px_24px_rgba(180,83,9,0.28)] break-words">
                            <span className="absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-amber-300/90 bg-amber-200" />
                            {achievement.description}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-4 text-center space-y-3">
                  <p className="text-sm font-medium text-amber-900">Тут з'являться твої ачівки</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={index}
                        className="h-14 rounded-xl border border-amber-200/80 bg-amber-100/50 flex items-center justify-center text-amber-500"
                      >
                        <Coins className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700">Виконуй правила табору і збирай нагороди</p>
                </div>
              )}
            </div>
          </section>

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
                            className="w-full h-full object-contain p-0.5"
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

          {isPromoOpen && (
            <BottomSheet onClose={() => setIsPromoOpen(false)} className="p-6 space-y-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
              <p className="text-xl font-bold text-gray-900">Активувати бонус-код</p>
              <p className="text-sm text-gray-500">Введи код із цифр та латинських літер</p>

              <input
                value={promoCodeValue}
                onChange={(e) => setPromoCodeValue(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Наприклад: A7K2M9QX"
                autoCapitalize="characters"
                autoCorrect="off"
              />

              {promoError && <p className="text-sm text-red-500">{promoError}</p>}
              {promoMessage && <p className="text-sm text-green-600">{promoMessage}</p>}

              <button
                type="button"
                onClick={handleRedeemPromoCode}
                disabled={isPending}
                className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {isPending ? 'Активація...' : 'Активувати код'}
              </button>
            </BottomSheet>
          )}
        </>
      )}
    </div>
  )
}
