import { useState } from 'react'
import { type Child, useChildBalance, useChildren } from '../../features/children'
import { type Squad, useSquads } from '../../features/squads'
import {
  type CoinRule,
  useBulkEarnTalents,
  useBulkSpendTalents,
  useCoinRules,
  useEarnTalents,
  usePenaltyRules,
  useSpendTalents,
} from '../../features/transactions'

function formatBirthDate(value: string) {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function EarnSheet({
  child,
  rules,
  penalties,
  onClose,
}: {
  child: Child
  rules: CoinRule[]
  penalties: CoinRule[]
  onClose: () => void
}) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [showAwardForm, setShowAwardForm] = useState(false)
  const [penaltySelected, setPenaltySelected] = useState<CoinRule | null>(null)
  const [penaltyCustomReason, setPenaltyCustomReason] = useState('')
  const [penaltyCustomAmount, setPenaltyCustomAmount] = useState('')
  const [penaltyComment, setPenaltyComment] = useState('')
  const [penaltyMode, setPenaltyMode] = useState<'preset' | 'custom'>('preset')
  const [showPenaltyForm, setShowPenaltyForm] = useState(false)
  const { mutate, isPending } = useEarnTalents()
  const { mutate: spend, isPending: isSpending } = useSpendTalents()
  const { data: balance = 0 } = useChildBalance(child.id)

  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0
  const spendAmount = penaltyMode === 'preset' ? Math.abs(penaltySelected?.points ?? 0) : Number(penaltyCustomAmount) || 0
  const canSpend = penaltyMode === 'preset' ? !!penaltySelected : !!penaltyCustomReason && spendAmount > 0

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate({ childId: child.id, amount: earnAmount, reason, comment: comment || undefined }, { onSuccess: onClose })
  }

  function handlePenaltySubmit() {
    if (!canSpend) return
    const reason = penaltyMode === 'preset' ? penaltySelected!.label : penaltyCustomReason
    spend(
      {
        childId: child.id,
        amount: spendAmount,
        reason,
        comment: penaltyComment || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">
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
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm text-gray-700">
            <p><span className="text-gray-400">Дата народження:</span> {formatBirthDate(child.dateOfBirth)}</p>
            <p><span className="text-gray-400">Ім'я та прізвище батьків:</span> {child.parentName || '—'}</p>
            <p><span className="text-gray-400">Телефон батьків:</span> {child.parentPhone || '—'}</p>
            <p><span className="text-gray-400">Медичні примітки:</span> {child.medicalNotes || '—'}</p>
          </div>
          <button
            onClick={() => setShowAwardForm((prev) => !prev)}
            className="w-full mt-3 bg-violet-600 text-white font-semibold py-3 rounded-xl text-base"
          >
            Нарахувати бали
          </button>
          <button
            onClick={() => setShowPenaltyForm((prev) => !prev)}
            className="w-full mt-2 bg-red-600 text-white font-semibold py-3 rounded-xl text-base"
          >
            Зняти бали
          </button>
        </div>

        {showAwardForm && (
          <div className="px-6 pb-8 space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setMode('preset')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'preset' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Пресет</button>
              <button onClick={() => setMode('custom')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'custom' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Власне</button>
            </div>

            {mode === 'preset' ? (
              rules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Правил нарахування ще немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {rules.map((rule) => (
                    <button key={rule.id} onClick={() => setSelected(rule === selected ? null : rule)} className={`rounded-xl border px-3 py-2 text-left ${selected?.id === rule.id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                      <p className="text-sm font-bold">+{rule.points}</p>
                      <p className="text-xs">{rule.label}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Причина нарахування" />
                <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Кількість балів" />
              </div>
            )}

            <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" placeholder="Коментар (необов'язково)" />
            <button onClick={handleSubmit} disabled={!canSubmit || isPending} className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
              {isPending ? 'Збереження...' : `Нарахувати +${earnAmount || 0} ⭐`}
            </button>
          </div>
        )}

        {showPenaltyForm && (
          <div className="px-6 pb-8 space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setPenaltyMode('preset')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${penaltyMode === 'preset' ? 'bg-white text-red-600' : 'text-gray-500'}`}>Пресет</button>
              <button onClick={() => setPenaltyMode('custom')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${penaltyMode === 'custom' ? 'bg-white text-red-600' : 'text-gray-500'}`}>Власне</button>
            </div>

            {penaltyMode === 'preset' ? (
              penalties.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Правил покарання ще немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {penalties.map((rule) => (
                    <button key={rule.id} onClick={() => setPenaltySelected(rule === penaltySelected ? null : rule)} className={`rounded-xl border px-3 py-2 text-left ${penaltySelected?.id === rule.id ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                      <p className="text-sm font-bold">-{Math.abs(rule.points)}</p>
                      <p className="text-xs">{rule.label}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input value={penaltyCustomReason} onChange={(e) => setPenaltyCustomReason(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Причина покарання" />
                <input type="number" min="1" value={penaltyCustomAmount} onChange={(e) => setPenaltyCustomAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Кількість балів" />
              </div>
            )}

            <input value={penaltyComment} onChange={(e) => setPenaltyComment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" placeholder="Коментар (необов'язково)" />
            <button onClick={handlePenaltySubmit} disabled={!canSpend || isSpending} className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
              {isSpending ? 'Збереження...' : `Зняти -${spendAmount || 0} ⭐`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BulkEarnSheet({ children, rules, onClose }: { children: Child[]; rules: CoinRule[]; onClose: () => void }) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const { mutate, isPending } = useBulkEarnTalents()
  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate({ childIds: children.map((c) => c.id), amount: earnAmount, reason, comment: comment || undefined }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <p className="text-lg font-bold text-gray-900">Масове нарахування ({children.length})</p>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setMode('preset')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'preset' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Пресет</button>
          <button onClick={() => setMode('custom')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'custom' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Власне</button>
        </div>
        {mode === 'preset' ? (
          <div className="grid grid-cols-2 gap-2">
            {rules.map((rule) => (
              <button key={rule.id} onClick={() => setSelected(selected?.id === rule.id ? null : rule)} className={`rounded-xl border px-3 py-2 text-left ${selected?.id === rule.id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                <p className="text-sm font-bold">+{rule.points}</p>
                <p className="text-xs">{rule.label}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Причина нарахування" />
            <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Кількість балів" />
          </div>
        )}
        <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" placeholder="Коментар (необов'язково)" />
        <button onClick={handleSubmit} disabled={!canSubmit || isPending || children.length === 0} className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
          {isPending ? 'Збереження...' : `Нарахувати вибраним +${earnAmount || 0} ⭐`}
        </button>
      </div>
    </div>
  )
}

function BulkPenaltySheet({ children, rules, onClose }: { children: Child[]; rules: CoinRule[]; onClose: () => void }) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const { mutate, isPending } = useBulkSpendTalents()
  const spendAmount = mode === 'preset' ? Math.abs(selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && spendAmount > 0

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate({ childIds: children.map((c) => c.id), amount: spendAmount, reason, comment: comment || undefined }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <p className="text-lg font-bold text-gray-900">Масове покарання ({children.length})</p>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setMode('preset')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'preset' ? 'bg-white text-red-600' : 'text-gray-500'}`}>Пресет</button>
          <button onClick={() => setMode('custom')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'custom' ? 'bg-white text-red-600' : 'text-gray-500'}`}>Власне</button>
        </div>
        {mode === 'preset' ? (
          <div className="grid grid-cols-2 gap-2">
            {rules.map((rule) => (
              <button key={rule.id} onClick={() => setSelected(selected?.id === rule.id ? null : rule)} className={`rounded-xl border px-3 py-2 text-left ${selected?.id === rule.id ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                <p className="text-sm font-bold">-{Math.abs(rule.points)}</p>
                <p className="text-xs">{rule.label}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Причина покарання" />
            <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Кількість балів" />
          </div>
        )}
        <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" placeholder="Коментар (необов'язково)" />
        <button onClick={handleSubmit} disabled={!canSubmit || isPending || children.length === 0} className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
          {isPending ? 'Збереження...' : `Зняти вибраним -${spendAmount || 0} ⭐`}
        </button>
      </div>
    </div>
  )
}

function SquadChildren({ squad, rules, penalties }: { squad: Squad; rules: CoinRule[]; penalties: CoinRule[] }) {
  const { data: children, isLoading } = useChildren(squad.id)
  const [earnFor, setEarnFor] = useState<Child | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPenaltyOpen, setBulkPenaltyOpen] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])

  const childList = children ?? []
  const selectedChildren = childList.filter((child) => selectedChildIds.includes(child.id))

  function toggleChildSelection(childId: string) {
    setSelectedChildIds((prev) => (prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]))
  }
  function selectAllChildren() {
    setSelectedChildIds(childList.map((child) => child.id))
  }
  function clearSelectedChildren() {
    setSelectedChildIds([])
    setIsBulkMode(false)
  }
  function startBulkSelection() {
    setIsBulkMode(true)
    selectAllChildren()
  }

  return (
    <div className="mt-2 space-y-2">
      {isLoading ? (
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ) : childList.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">Дітей у загоні ще немає</p>
      ) : (
        <>
          {!isBulkMode ? (
            <button onClick={startBulkSelection} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600">Вибрати всіх</button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={clearSelectedChildren} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600">Очистити</button>
              <button onClick={() => setBulkOpen(true)} disabled={selectedChildren.length === 0} className="ml-auto px-3 py-1.5 rounded-full bg-violet-600 text-white text-xs font-semibold disabled:opacity-50">Нарахувати бали ({selectedChildren.length})</button>
              <button onClick={() => setBulkPenaltyOpen(true)} disabled={selectedChildren.length === 0} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold disabled:opacity-50">Зняти бали ({selectedChildren.length})</button>
            </div>
          )}

          {childList.map((child) => {
            const isSelected = selectedChildIds.includes(child.id)
            return (
              <div key={child.id} className="w-full flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                <button
                  onClick={() => {
                    if (isBulkMode) {
                      toggleChildSelection(child.id)
                    } else {
                      setEarnFor(child)
                    }
                  }}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className="text-xl">{child.gender === 'male' ? '👦' : '👧'}</span>
                  <div className="flex-1"><p className="font-medium text-gray-900 text-sm">{child.firstName} {child.lastName}</p></div>
                  {isBulkMode ? <span className={`text-lg ${isSelected ? 'text-violet-600' : 'text-gray-300'}`}>{isSelected ? '☑' : '☐'}</span> : <span className="text-gray-300 text-lg">›</span>}
                </button>
                {!isBulkMode && <button onClick={() => setEarnFor(child)} className="px-2 py-1 rounded-lg text-violet-600 text-sm font-semibold">⭐</button>}
              </div>
            )
          })}
        </>
      )}

      {earnFor && <EarnSheet child={earnFor} rules={rules} penalties={penalties} onClose={() => setEarnFor(null)} />}
      {bulkOpen && <BulkEarnSheet children={selectedChildren} rules={rules} onClose={() => { setBulkOpen(false); clearSelectedChildren() }} />}
      {bulkPenaltyOpen && <BulkPenaltySheet children={selectedChildren} rules={penalties} onClose={() => { setBulkPenaltyOpen(false); clearSelectedChildren() }} />}
    </div>
  )
}

export function MySquadsPage() {
  const { data: squads, isLoading } = useSquads()
  const { data: rules = [] } = useCoinRules()
  const { data: penalties = [] } = usePenaltyRules()
  const [openSquad, setOpenSquad] = useState<string | null>(null)

  const squadList = squads ?? []

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мої загони</h1>
        <p className="text-sm text-gray-400 mt-0.5">{squadList.length} загонів</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
      ) : squadList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="font-medium">Загонів ще немає</p>
          <p className="text-sm mt-1">Зверніться до адміністратора</p>
        </div>
      ) : (
        <div className="space-y-3">
          {squadList.map((squad) => (
            <div key={squad.id}>
              <button onClick={() => setOpenSquad(openSquad === squad.id ? null : squad.id)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: squad.color }} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{squad.name}</p>
                  {squad.description && <p className="text-sm text-gray-400">{squad.description}</p>}
                </div>
                <span className={`text-gray-400 text-lg transition-transform ${openSquad === squad.id ? 'rotate-90' : ''}`}>›</span>
              </button>
              {openSquad === squad.id && <SquadChildren squad={squad} rules={rules} penalties={penalties} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
