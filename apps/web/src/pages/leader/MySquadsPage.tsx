import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthContext'
import { useChildren, useChildBalance } from '../../features/children'
import { type Squad, useSquads } from '../../features/squads'
import { type CoinRule, useCoinRules, useEarnTalents } from '../../features/transactions'

// --- Earn Sheet ---
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
  const { data: balance } = useChildBalance(child.id)

  function handleSubmit() {
    const amount = mode === 'preset' ? selected!.points : Number(customAmount)
    const reason = mode === 'preset' ? selected!.label : customReason
    if (!amount || !reason) return

    mutate({ childId: child.id, amount, reason, comment: comment || undefined }, { onSuccess: onClose })
  }

  const canSubmit = mode === 'preset' ? !!selected : !!customReason && !!customAmount && Number(customAmount) > 0

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        <div className="p-6 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-900">
              {child.firstName} {child.lastName}
            </h2>
            <span className="text-sm font-semibold text-violet-600">
              ⭐ {balance ?? 0}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4">Нарахувати таланти</p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode('preset')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                mode === 'preset' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'
              }`}>
              Пресет
            </button>
            <button onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                mode === 'custom' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'
              }`}>
              Власне
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {mode === 'preset' ? (
            <div className="space-y-2">
              {rules.map((rule) => (
                <button key={rule.id} onClick={() => setSelected(rule)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                    selected?.id === rule.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                  <span className="text-sm font-medium text-gray-800">{rule.label}</span>
                  <span className="text-sm font-bold text-violet-600">+{rule.points}</span>
                </button>
              ))}
              {rules.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Правил нарахування ще немає. Попросіть адміна додати.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Причина *</label>
                <input value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Допоміг приготувати обід..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кількість талантів *</label>
                <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="500" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Коментар</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Необов'язково" />
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit || isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-40 active:scale-95 transition-transform">
            {isPending ? 'Збереження...' : `Нарахувати ${mode === 'preset' && selected ? `+${selected.points}` : customAmount ? `+${customAmount}` : ''}`}
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
  const { user } = useAuth()
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


