import { useEffect, useMemo, useState } from 'react'
import {
  type Child,
  useChildBalance,
  useChildren,
  useCreateChild,
  useDeleteChild,
  useMoveChildToSquad,
} from '../../features/children'
import { useSquads } from '../../features/squads'
import {
  useBulkEarnTalents,
  useCoinRules,
  useEarnTalents,
  usePenaltyRules,
  useSpendTalents,
} from '../../features/transactions'

function genderLabel(g: Child['gender']) {
  return g === 'male' ? '👦' : '👧'
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 9)
}

function formatBirthDate(value: string) {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function ChildCard({
  child,
  squads,
  isBulkMode,
  isSelected,
  onClick,
}: {
  child: Child
  squads?: { id: string; name: string; color: string }[]
  isBulkMode: boolean
  isSelected: boolean
  onClick: (child: Child) => void
}) {
  const squad = squads?.find((s) => s.id === child.squadId)
  return (
    <button
      onClick={() => onClick(child)}
      className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
    >
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
        {genderLabel(child.gender)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{child.firstName} {child.lastName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {squad && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: squad.color }} />
              {squad.name}
            </span>
          )}
        </div>
      </div>
      <span className={`text-lg ${isBulkMode ? (isSelected ? 'text-violet-600' : 'text-gray-300') : 'text-gray-300'}`}>
        {isBulkMode ? (isSelected ? '☑' : '☐') : '›'}
      </span>
    </button>
  )
}

function BulkEarnSheet({
  children,
  rules,
  onClose,
}: {
  children: Child[]
  rules: { id: string; label: string; points: number }[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const { mutate, isPending } = useBulkEarnTalents()

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null
  const earnAmount = mode === 'preset' ? (selectedRule?.points ?? 0) : Number(customAmount) || 0
  const reason = mode === 'preset' ? selectedRule?.label ?? '' : customReason.trim()
  const canSubmit = earnAmount > 0 && reason.length > 0 && children.length > 0

  function handleSubmit() {
    if (!canSubmit) return
    mutate(
      {
        childIds: children.map((child) => child.id),
        amount: earnAmount,
        reason,
        comment: comment.trim() || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <p className="text-lg font-semibold text-gray-900">Масове нарахування ({children.length})</p>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode('preset')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'preset' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Пресет
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'custom' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Власне
          </button>
        </div>

        {mode === 'preset' ? (
          rules.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Активних правил нарахування поки немає</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRuleId(selectedRuleId === rule.id ? null : rule.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    selectedRuleId === rule.id
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-sm font-bold">+{rule.points}</p>
                  <p className="text-xs">{rule.label}</p>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Причина нарахування"
            />
            <input
              type="number"
              min="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Кількість балів"
            />
          </div>
        )}

        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Коментар (необов'язково)"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isPending ? 'Збереження...' : `Нарахувати вибраним +${earnAmount || 0} ⭐`}
        </button>
      </div>
    </div>
  )
}

function ChildDetailSheet({
  child,
  squad,
  squads,
  onClose,
  onChildUpdated,
  onChildDeleted,
}: {
  child: Child
  squad?: { id: string; name: string; color: string }
  squads: { id: string; name: string; color: string }[]
  onClose: () => void
  onChildUpdated: (child: Child) => void
  onChildDeleted: () => void
}) {
  const { data: balance = 0 } = useChildBalance(child.id)
  const { data: rules = [] } = useCoinRules()
  const { data: penaltyRules = [] } = usePenaltyRules()
  const { mutate: earn, isPending } = useEarnTalents()
  const { mutate: spend, isPending: isSpending } = useSpendTalents()
  const { mutate: moveToSquad, isPending: isMoving } = useMoveChildToSquad()
  const { mutate: deleteChild, isPending: isDeleting } = useDeleteChild()
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [selectedSquadId, setSelectedSquadId] = useState(child.squadId)
  const [showManageSheet, setShowManageSheet] = useState(false)
  const [showEarnSheet, setShowEarnSheet] = useState(false)
  const [showPenaltySheet, setShowPenaltySheet] = useState(false)
  const [selectedPenaltyRuleId, setSelectedPenaltyRuleId] = useState<string | null>(null)
  const [customPenaltyReason, setCustomPenaltyReason] = useState('')
  const [customPenaltyAmount, setCustomPenaltyAmount] = useState('')
  const [penaltyComment, setPenaltyComment] = useState('')
  const [penaltyMode, setPenaltyMode] = useState<'preset' | 'custom'>('preset')

  useEffect(() => {
    setSelectedSquadId(child.squadId)
  }, [child.id, child.squadId])

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null
  const earnAmount = mode === 'preset' ? (selectedRule?.points ?? 0) : Number(customAmount) || 0
  const reason = mode === 'preset' ? selectedRule?.label ?? '' : customReason.trim()
  const canSubmit = earnAmount > 0 && reason.length > 0
  const selectedPenaltyRule = penaltyRules.find((r) => r.id === selectedPenaltyRuleId) ?? null
  const penaltyAmount = penaltyMode === 'preset'
    ? Math.abs(selectedPenaltyRule?.points ?? 0)
    : Number(customPenaltyAmount) || 0
  const penaltyReason = penaltyMode === 'preset'
    ? selectedPenaltyRule?.label ?? ''
    : customPenaltyReason.trim()
  const canSubmitPenalty = penaltyAmount > 0 && penaltyReason.length > 0

  function handleEarn() {
    if (!canSubmit) return
    earn(
      {
        childId: child.id,
        amount: earnAmount,
        reason,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedRuleId(null)
          setCustomReason('')
          setCustomAmount('')
          setComment('')
        },
      },
    )
  }

  function handleMoveToSquad() {
    if (!selectedSquadId || selectedSquadId === child.squadId) return
    moveToSquad(
      { childId: child.id, squadId: selectedSquadId },
      {
        onSuccess: (updatedChild) => {
          onChildUpdated(updatedChild)
          setShowManageSheet(false)
        },
      },
    )
  }

  function handleDeleteChild() {
    const confirmed = window.confirm(`Видалити дитину ${child.firstName} ${child.lastName}?`)
    if (!confirmed) return
    deleteChild(child.id, {
      onSuccess: () => {
        onChildDeleted()
      },
    })
  }

  function handlePenalty() {
    if (!canSubmitPenalty) return
    spend(
      {
        childId: child.id,
        amount: penaltyAmount,
        reason: penaltyReason,
        comment: penaltyComment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedPenaltyRuleId(null)
          setCustomPenaltyReason('')
          setCustomPenaltyAmount('')
          setPenaltyComment('')
          setShowPenaltySheet(false)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {genderLabel(child.gender)} {child.firstName} {child.lastName}
            </p>
            {squad && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: squad.color }} />
                {squad.name}
              </p>
            )}
          </div>
          <div className="bg-violet-50 rounded-2xl px-3 py-2 text-right">
            <p className="text-xs text-violet-400">Баланс</p>
            <p className="text-lg font-bold text-violet-600">⭐ {balance}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm text-gray-700">
          <p>
            <span className="text-gray-400">Дата народження:</span> {formatBirthDate(child.dateOfBirth)}
          </p>
          <p>
            <span className="text-gray-400">Ім'я та прізвище батьків:</span> {child.parentName || '—'}
          </p>
          <p>
            <span className="text-gray-400">Телефон батьків:</span> {child.parentPhone || '—'}
          </p>
          <p>
            <span className="text-gray-400">Медичні примітки:</span> {child.medicalNotes || '—'}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setShowManageSheet(true)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold"
          >
            Керування
          </button>
          <button
            onClick={() => setShowEarnSheet(true)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold"
          >
            Нарахувати бали
          </button>
          <button
            onClick={() => setShowPenaltySheet(true)}
            className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold"
          >
            Покарання (зняти бали)
          </button>
        </div>
      </div>

      {showManageSheet && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowManageSheet(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Керування дитиною</p>
            <div className="flex gap-2">
              <select
                value={selectedSquadId}
                onChange={(e) => setSelectedSquadId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMoveToSquad}
                disabled={isMoving || selectedSquadId === child.squadId}
                className="px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isMoving ? 'Переміщення...' : 'Перемістити'}
              </button>
            </div>
            <button
              onClick={handleDeleteChild}
              disabled={isDeleting}
              className="w-full px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold disabled:opacity-50"
            >
              {isDeleting ? 'Видалення...' : 'Видалити дитину'}
            </button>
          </div>
        </div>
      )}

      {showEarnSheet && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEarnSheet(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Нарахувати бали</p>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setMode('preset')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'preset' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                Пресет
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'custom' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                Власне
              </button>
            </div>

            {mode === 'preset' ? (
              rules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Активних правил нарахування поки немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {rules.map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => setSelectedRuleId(selectedRuleId === rule.id ? null : rule.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        selectedRuleId === rule.id
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <p className="text-sm font-bold">+{rule.points}</p>
                      <p className="text-xs">{rule.label}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Причина нарахування"
                />
                <input
                  type="number"
                  min="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Кількість балів"
                />
              </div>
            )}

            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Коментар (необов'язково)"
            />
            <button
              onClick={handleEarn}
              disabled={!canSubmit || isPending}
              className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isPending ? 'Збереження...' : `Нарахувати${earnAmount > 0 ? ` +${earnAmount}` : ''} ⭐`}
            </button>
          </div>
        </div>
      )}
      {showPenaltySheet && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPenaltySheet(false)} />
          <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Покарання</p>

            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setPenaltyMode('preset')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  penaltyMode === 'preset' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Пресет
              </button>
              <button
                onClick={() => setPenaltyMode('custom')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  penaltyMode === 'custom' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Власне
              </button>
            </div>

            {penaltyMode === 'preset' ? (
              penaltyRules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Активних правил покарання поки немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {penaltyRules.map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => setSelectedPenaltyRuleId(selectedPenaltyRuleId === rule.id ? null : rule.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        selectedPenaltyRuleId === rule.id
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <p className="text-sm font-bold">-{Math.abs(rule.points)}</p>
                      <p className="text-xs">{rule.label}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input
                  value={customPenaltyReason}
                  onChange={(e) => setCustomPenaltyReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Причина покарання"
                />
                <input
                  type="number"
                  min="1"
                  value={customPenaltyAmount}
                  onChange={(e) => setCustomPenaltyAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Кількість балів"
                />
              </div>
            )}

            <input
              value={penaltyComment}
              onChange={(e) => setPenaltyComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Коментар (необов'язково)"
            />
            <button
              onClick={handlePenalty}
              disabled={!canSubmitPenalty || isSpending}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isSpending ? 'Збереження...' : `Зняти${penaltyAmount > 0 ? ` -${penaltyAmount}` : ''} ⭐`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateChildSheet({
  onClose,
  squads,
}: {
  onClose: () => void
  squads: { id: string; name: string; color: string }[]
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    squadId: squads[0]?.id ?? '',
    dateOfBirth: '',
    gender: 'male' as Child['gender'],
    parentName: '',
    parentPhoneDigits: '',
    medicalNotes: '',
  })
  const { mutate, isPending, error } = useCreateChild()

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        squadId: form.squadId,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentName: form.parentName.trim() || undefined,
        parentPhone: form.parentPhoneDigits ? `+380${form.parentPhoneDigits}` : undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Нова дитина</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Іван" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Іваненко" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Загін *</label>
            <select value={form.squadId} onChange={(e) => set('squadId', e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              {squads.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Стать *</label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                    form.gender === g ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  {g === 'male' ? '👦 Хлопець' : '👧 Дівчина'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата народження *</label>
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я та прізвище батьків</label>
            <input value={form.parentName} onChange={(e) => set('parentName', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Напр. Олена Іваненко" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон батьків</label>
            <div className="w-full flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-violet-500">
              <span className="pl-4 pr-2 py-3 text-gray-700 font-medium">+380</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="tel-national"
                value={form.parentPhoneDigits}
                onChange={(e) => set('parentPhoneDigits', normalizePhoneDigits(e.target.value))}
                className="w-full pr-4 py-3 rounded-r-xl text-base focus:outline-none"
                placeholder="XX XXX XX XX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Медичні примітки</label>
            <input value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Алергії, особливості..." />
          </div>

          {error && <p className="text-red-500 text-sm">Помилка. Перевірте дані.</p>}

          <button type="submit" disabled={isPending}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
            {isPending ? 'Збереження...' : 'Зареєструвати'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ChildrenPage() {
  const { data: children, isLoading } = useChildren()
  const { data: squads } = useSquads()
  const { data: rules = [] } = useCoinRules()
  const [showCreate, setShowCreate] = useState(false)
  const [filterSquad, setFilterSquad] = useState<string>('')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  const [showBulkEarn, setShowBulkEarn] = useState(false)

  const filtered = filterSquad ? children?.filter((c) => c.squadId === filterSquad) : children
  const selectedChildren = useMemo(
    () => (filtered ?? []).filter((child) => selectedChildIds.includes(child.id)),
    [filtered, selectedChildIds],
  )

  function toggleChildSelection(child: Child) {
    setSelectedChildIds((prev) =>
      prev.includes(child.id) ? prev.filter((id) => id !== child.id) : [...prev, child.id],
    )
  }

  function selectAllChildren() {
    setSelectedChildIds((filtered ?? []).map((child) => child.id))
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Діти</h1>
          <p className="text-sm text-gray-400 mt-0.5">{children?.length ?? 0} зареєстровано</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {/* Фільтр по загону */}
      {squads && squads.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          <button onClick={() => setFilterSquad('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !filterSquad ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500'
            }`}>
            Всі
          </button>
          {squads.map((s) => (
            <button key={s.id} onClick={() => setFilterSquad(s.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filterSquad === s.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'
              }`}
              style={filterSquad === s.id ? { backgroundColor: s.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterSquad === s.id ? 'white' : s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {!isBulkMode ? (
            <button
              onClick={startBulkSelection}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-600"
            >
              Обрати всіх
            </button>
          ) : (
            <>
              <button
                onClick={clearSelectedChildren}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-600"
              >
                Очистити
              </button>
              <button
                onClick={() => setShowBulkEarn(true)}
                disabled={selectedChildren.length === 0}
                className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-600 text-white disabled:opacity-50"
              >
                Нарахувати ({selectedChildren.length})
              </button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👧</p>
          <p className="font-medium">Дітей ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб зареєструвати</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              squads={squads}
              isBulkMode={isBulkMode}
              isSelected={selectedChildIds.includes(child.id)}
              onClick={(value) => {
                if (isBulkMode) {
                  toggleChildSelection(value)
                  return
                }
                setSelectedChild(value)
              }}
            />
          ))}
        </div>
      )}

      {showCreate && squads && squads.length > 0 && (
        <CreateChildSheet onClose={() => setShowCreate(false)} squads={squads} />
      )}
      {showCreate && (!squads || squads.length === 0) && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold mb-2">Спочатку створіть загони</p>
            <p className="text-sm text-gray-400">Дитина повинна належати до загону</p>
          </div>
        </div>
      )}
      {selectedChild && (
        <ChildDetailSheet
          child={selectedChild}
          squad={squads?.find((s) => s.id === selectedChild.squadId)}
          squads={squads ?? []}
          onClose={() => setSelectedChild(null)}
          onChildUpdated={setSelectedChild}
          onChildDeleted={() => setSelectedChild(null)}
        />
      )}
      {showBulkEarn && (
        <BulkEarnSheet
          children={selectedChildren}
          rules={rules}
          onClose={() => {
            setShowBulkEarn(false)
            clearSelectedChildren()
          }}
        />
      )}
    </div>
  )
}
