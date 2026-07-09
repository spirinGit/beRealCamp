import { useState } from 'react'
import { useChildren, useChildBalance } from '../../features/children'
import { type Squad, useSquads } from '../../features/squads'
import { type CoinRule, useCoinRules, useEarnTalents } from '../../features/transactions'

// --- Earn Sheet (redesigned) ---
function EarnSheet({
  child,
  rules,
  onClose,
}: {
  child: { id: string; firstName: string; lastName: string }
  rules: CoinRule[]
  onClose: () => void
}) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const { mutate, isPending } = useEarnTalents()
  const { data: balance = 0 } = useChildBalance(child.id)

  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0

  function handleSubmit() {
    const amount = earnAmount
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate({ childId: child.id, amount, reason, comment: comment || undefined }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">

        {/* Header з балансом */}
        <div className="px-6 pt-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Нарахування</p>
              <h2 className="text-2xl font-bold text-gray-900">{child.firstName}</h2>
              <p className="text-lg font-semibold text-gray-600">{child.lastName}</p>
            </div>
            <div className="bg-violet-50 rounded-2xl px-4 py-3 text-right">
              <p className="text-xs text-violet-400 mb-0.5">Баланс</p>
              <p className="text-xl font-bold text-violet-600">⭐ {balance}</p>
              {earnAmount > 0 && (
                <p className="text-xs text-green-500 font-medium mt-0.5">→ {balance + earnAmount}</p>
              )}
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setMode('preset')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'preset' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
              }`}>
              Пресет
            </button>
            <button onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === 'custom' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
              }`}>
              Власне
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 space-y-4">
          {mode === 'preset' ? (
            <>
              {rules.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-3xl mb-2">⭐</p>
                  <p className="text-sm">Правил нарахування ще немає</p>
                  <p className="text-xs mt-1">Попросіть адміна додати</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {rules.map((rule) => (
                    <button key={rule.id} onClick={() => setSelected(rule === selected ? null : rule)}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left active:scale-95 ${
                        selected?.id === rule.id
                          ? 'border-violet-500 bg-violet-600 shadow-md'
                          : 'border-gray-100 bg-gray-50'
                      }`}>
                      <span className={`text-xl font-bold mb-1 ${selected?.id === rule.id ? 'text-white' : 'text-violet-600'}`}>
                        +{rule.points}
                      </span>
                      <span className={`text-xs leading-snug ${selected?.id === rule.id ? 'text-violet-100' : 'text-gray-600'}`}>
                        {rule.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Причина *</label>
                <input value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Допоміг приготувати обід..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Кількість талантів *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500 font-bold">+</span>
                  <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="1000" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Коментар</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Необов'язково" />
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit || isPending}
            className={`w-full font-bold py-4 rounded-2xl text-base transition-all active:scale-95 ${
              canSubmit && !isPending
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-200'
                : 'bg-gray-100 text-gray-400'
            }`}>
            {isPending ? 'Збереження...' : canSubmit ? `Нарахувати +${earnAmount} ⭐` : 'Оберіть готову нагороду або створіть власну'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Squad Children List ---
function SquadChildren({
  squad,
  rules,
}: {
  squad: Squad
  rules: CoinRule[]
}) {
  const { data: children, isLoading } = useChildren(squad.id)
  const [earnFor, setEarnFor] = useState<{ id: string; firstName: string; lastName: string } | null>(null)

  return (
    <div className="mt-2 space-y-2">
      {isLoading ? (
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ) : children?.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">Дітей у загоні ще немає</p>
      ) : (
        children?.map((child) => (
          <button key={child.id} onClick={() => setEarnFor(child)}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm active:scale-[0.98] transition-transform text-left">
            <span className="text-xl">{child.gender === 'male' ? '👦' : '👧'}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{child.firstName} {child.lastName}</p>
            </div>
            <span className="text-violet-500 text-sm font-semibold">⭐ нарахувати</span>
          </button>
        ))
      )}

      {earnFor && (
        <EarnSheet child={earnFor} rules={rules} onClose={() => setEarnFor(null)} />
      )}
    </div>
  )
}

// --- Main Page ---
export function MySquadsPage() {
  const { data: squads, isLoading } = useSquads()
  const { data: rules = [] } = useCoinRules()
  const [openSquad, setOpenSquad] = useState<string | null>(null)

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мої загони</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {squads?.length ?? 0} загонів
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : squads?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="font-medium">Загонів ще немає</p>
          <p className="text-sm mt-1">Зверніться до адміністратора</p>
        </div>
      ) : (
        <div className="space-y-3">
          {squads?.map((squad) => (
            <div key={squad.id}>
              <button onClick={() => setOpenSquad(openSquad === squad.id ? null : squad.id)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: squad.color }} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{squad.name}</p>
                  {squad.description && <p className="text-sm text-gray-400">{squad.description}</p>}
                </div>
                <span className={`text-gray-400 text-lg transition-transform ${openSquad === squad.id ? 'rotate-90' : ''}`}>›</span>
              </button>

              {openSquad === squad.id && (
                <SquadChildren squad={squad} rules={rules} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


