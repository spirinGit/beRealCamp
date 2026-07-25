import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSquadAttendance } from '../../features/attendance'
import {
  type Child,
  uploadChildAvatarFile,
  useChildBalance,
  useChildren,
  useCreateChild,
  useCreateChildAvatarUploadUrl,
  useDeleteChild,
  useMoveChildToSquad,
  useUpdateChild,
} from '../../features/children'
import { useSquads } from '../../features/squads'
import { BottomSheet, PhotoViewer } from '../../shared/ui'
import {
  useBulkEarnCoins,
  useCoinRules,
  useEarnCoins,
  usePenaltyRules,
  useSpendCoins,
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

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function attendanceState(
  day: string,
  today: string,
  joinedAt: string,
  attendance: Record<string, boolean>,
) {
  const joinedDay = formatDayKey(new Date(joinedAt))

  if (day < joinedDay || day > today) return 'inactive'
  if (attendance[day] === true) return 'present'
  return 'absent'
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
      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
        {child.photoUrl
          ? <img src={child.photoUrl} alt={child.firstName} className="w-full h-full object-cover" />
          : genderLabel(child.gender)
        }
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
  rules: { id: string; label: string; points: number; description: string | null; photoUrl: string | null; isAchievement: boolean }[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const { mutate, isPending } = useBulkEarnCoins()

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null
  const earnAmount = mode === 'preset' ? (selectedRule?.points ?? 0) : Number(customAmount) || 0
  const reason = mode === 'preset' ? selectedRule?.label ?? '' : customReason.trim()
  const shouldMarkAchievement = mode === 'preset' && selectedRule?.isAchievement === true
  const achievementKey = mode === 'preset' ? (selectedRule ? `rule:${selectedRule.id}` : null) : reason.toLowerCase()
  const earnMetadata = {
    ...(selectedRule?.photoUrl ? { rulePhotoUrl: selectedRule.photoUrl } : {}),
    ...(selectedRule?.description ? { ruleDescription: selectedRule.description } : {}),
    ...(shouldMarkAchievement && achievementKey ? { isAchievement: true, achievementKey } : {}),
  }
  const canSubmit = earnAmount > 0 && reason.length > 0 && children.length > 0

  function handleSubmit() {
    if (!canSubmit) return
    mutate(
      {
        childIds: children.map((child) => child.id),
        amount: earnAmount,
        reason,
        comment: comment.trim() || undefined,
        metadata: Object.keys(earnMetadata).length > 0 ? earnMetadata : undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
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
    </BottomSheet>
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
  const { data: attendanceOverview } = useSquadAttendance(child.squadId)
  const { data: rules = [] } = useCoinRules()
  const { data: penaltyRules = [] } = usePenaltyRules()
  const { mutate: earn, isPending } = useEarnCoins()
  const { mutate: spend, isPending: isSpending } = useSpendCoins()
  const { mutate: moveToSquad, isPending: isMoving } = useMoveChildToSquad()
  const { mutate: deleteChild, isPending: isDeleting } = useDeleteChild()
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [selectedSquadId, setSelectedSquadId] = useState(child.squadId)
  const [showManageSheet, setShowManageSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showEarnSheet, setShowEarnSheet] = useState(false)
  const [showPenaltySheet, setShowPenaltySheet] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
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
  const shouldMarkAchievement = mode === 'preset' && selectedRule?.isAchievement === true
  const achievementKey = mode === 'preset' ? (selectedRule ? `rule:${selectedRule.id}` : null) : reason.toLowerCase()
  const earnMetadata = {
    ...(selectedRule?.photoUrl ? { rulePhotoUrl: selectedRule.photoUrl } : {}),
    ...(selectedRule?.description ? { ruleDescription: selectedRule.description } : {}),
    ...(shouldMarkAchievement && achievementKey ? { isAchievement: true, achievementKey } : {}),
  }
  const canSubmit = earnAmount > 0 && reason.length > 0
  const selectedPenaltyRule = penaltyRules.find((r) => r.id === selectedPenaltyRuleId) ?? null
  const penaltyAmount = penaltyMode === 'preset'
    ? Math.abs(selectedPenaltyRule?.points ?? 0)
    : Number(customPenaltyAmount) || 0
  const penaltyReason = penaltyMode === 'preset'
    ? selectedPenaltyRule?.label ?? ''
    : customPenaltyReason.trim()
  const penaltyMetadata = selectedPenaltyRule?.photoUrl || selectedPenaltyRule?.description
    ? { rulePhotoUrl: selectedPenaltyRule.photoUrl, ruleDescription: selectedPenaltyRule.description ?? undefined }
    : undefined
  const canSubmitPenalty = penaltyAmount > 0 && penaltyReason.length > 0

  function handleEarn() {
    if (!canSubmit) return
    earn(
      {
        childId: child.id,
        amount: earnAmount,
        reason,
        comment: comment.trim() || undefined,
        metadata: Object.keys(earnMetadata).length > 0 ? earnMetadata : undefined,
      },
      {
        onSuccess: () => {
          setSelectedRuleId(null)
          setCustomReason('')
          setCustomAmount('')
          setComment('')
          setShowEarnSheet(false)
          onClose()
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
        metadata: penaltyMetadata,
      },
      {
        onSuccess: () => {
          setSelectedPenaltyRuleId(null)
          setCustomPenaltyReason('')
          setCustomPenaltyAmount('')
          setPenaltyComment('')
          setShowPenaltySheet(false)
          onClose()
        },
      },
    )
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-5 max-h-[92dvh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        {photoOpen && child.photoUrl && (
          <PhotoViewer src={child.photoUrl} alt={child.firstName} onClose={() => setPhotoOpen(false)} />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden cursor-pointer"
              onClick={() => child.photoUrl && setPhotoOpen(true)}
            >
              {child.photoUrl
                ? <img src={child.photoUrl} alt={child.firstName} className="w-full h-full object-cover" />
                : genderLabel(child.gender)
              }
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {child.firstName} {child.lastName}
              </p>
              {squad && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: squad.color }} />
                  {squad.name}
                </p>
              )}
            </div>
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

        {attendanceOverview && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-gray-700">Відвідуваність</p>
              <p className="text-xs text-gray-400">Дні табору</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {attendanceOverview.days.map((day) => {
                const records =
                  attendanceOverview.children.find((attendanceChild) => attendanceChild.id === child.id)
                    ?.attendance ?? {}
                const joinedAt =
                  attendanceOverview.children.find((attendanceChild) => attendanceChild.id === child.id)
                    ?.createdAt ?? child.createdAt
                const state = attendanceState(day, attendanceOverview.today, joinedAt, records)

                return (
                  <div
                    key={day}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      state === 'present'
                        ? 'bg-green-500 text-white'
                        : state === 'absent'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                    title={day}
                  >
                    {day.slice(8)}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => setShowEditSheet(true)}
            className="w-full px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            ✒️  Редагувати / Видалити дитину
          </button>
          <button
            onClick={() => setShowManageSheet(true)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold"
          >
            Змінити загін
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

      {showManageSheet && (
        <BottomSheet onClose={() => setShowManageSheet(false)} zIndex="z-30" className="p-6 space-y-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
          <div>
            <p className="text-lg font-bold text-gray-900">Змінити загін</p>
            <p className="text-sm text-gray-400 mt-0.5">{child.firstName} {child.lastName}</p>
          </div>
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
        </BottomSheet>
      )}

      {showEditSheet && (
        <EditChildSheet
          child={child}
          onClose={() => setShowEditSheet(false)}
          onUpdated={(updated) => { onChildUpdated(updated); setShowEditSheet(false); onClose() }}
          onDeleted={() => { setShowEditSheet(false); onChildDeleted() }}
        />
      )}

      {showEarnSheet && (
        <BottomSheet onClose={() => setShowEarnSheet(false)} zIndex="z-30" className="p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
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
        </BottomSheet>
      )}
      {showPenaltySheet && (
        <BottomSheet onClose={() => setShowPenaltySheet(false)} zIndex="z-30" className="p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
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
        </BottomSheet>
      )}
    </BottomSheet>
  )
}

function EditChildSheet({
  child,
  onClose,
  onUpdated,
  onDeleted,
}: {
  child: Child
  onClose: () => void
  onUpdated: (child: Child) => void
  onDeleted: () => void
}) {
  const [form, setForm] = useState({
    firstName: child.firstName,
    lastName: child.lastName,
    dateOfBirth: child.dateOfBirth,
    gender: child.gender,
    parentName: child.parentName ?? '',
    parentPhoneDigits: child.parentPhone ? child.parentPhone.replace(/^\+380/, '') : '',
    medicalNotes: child.medicalNotes ?? '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutateAsync: updateChild, isPending } = useUpdateChild(child.id)
  const { mutate: deleteChild, isPending: isDeleting } = useDeleteChild()
  const { mutateAsync: createAvatarUploadUrl, isPending: isUploadingAvatar } = useCreateChildAvatarUploadUrl()

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('Фото має бути у форматі JPEG, PNG або WEBP'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Максимальний розмір фото: 5 MB'); return
    }
    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createAvatarUploadUrl({ squadId: child.squadId, fileName: avatarFile.name, contentType: avatarFile.type })
        await uploadChildAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      const updated = await updateChild({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentName: form.parentName.trim() || undefined,
        parentPhone: form.parentPhoneDigits ? `+380${form.parentPhoneDigits}` : undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
        ...(photoUrl ? { photoUrl } : {}),
      })
      onUpdated(updated)
    } catch {
      setSubmitError('Помилка збереження')
    }
  }

  function handleDeleteChild() {
    const confirmed = window.confirm(`Видалити дитину ${child.firstName} ${child.lastName}?`)
    if (!confirmed) return

    deleteChild(child.id, {
      onSuccess: () => {
        onDeleted()
      },
    })
  }

  const displayPhoto = avatarPreviewUrl ?? child.photoUrl

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
      <p className="text-lg font-bold text-gray-900">Редагувати / Видалити дитину</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {displayPhoto
                ? <img src={displayPhoto} alt={child.firstName} className="w-full h-full object-cover" />
                : <span>{child.gender === 'male' ? '👦' : '👧'}</span>
              }
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {child.photoUrl || avatarPreviewUrl ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Іван" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище *</label>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Іваненко" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Стать *</label>
          <div className="flex gap-3">
            {(['male', 'female'] as const).map((g) => (
              <button key={g} type="button" onClick={() => set('gender', g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${form.gender === g ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'}`}>
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
            <input type="text" inputMode="numeric" autoComplete="tel-national"
              value={form.parentPhoneDigits}
              onChange={(e) => set('parentPhoneDigits', normalizePhoneDigits(e.target.value))}
              className="w-full pr-4 py-3 rounded-r-xl text-base focus:outline-none"
              placeholder="XX XXX XX XX" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Медичні примітки</label>
          <input value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Алергії, особливості..." />
        </div>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isPending || isUploadingAvatar}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
          {isPending || isUploadingAvatar ? 'Збереження...' : 'Зберегти зміни'}
        </button>
        <button
          type="button"
          onClick={handleDeleteChild}
          disabled={isDeleting}
          className="w-full border border-red-200 text-red-600 font-semibold py-3 rounded-xl text-base disabled:opacity-50"
        >
          {isDeleting ? 'Видалення...' : 'Видалити дитину'}
        </button>
      </form>
    </BottomSheet>
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
  const { mutateAsync: createChild, isPending, error } = useCreateChild()
  const { mutateAsync: createAvatarUploadUrl, isPending: isPreparingAvatarUpload } = useCreateChildAvatarUploadUrl()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitError(null)
      let photoUrl: string | undefined

      if (avatarFile) {
        const target = await createAvatarUploadUrl({
          squadId: form.squadId,
          fileName: avatarFile.name,
          contentType: avatarFile.type,
        })
        await uploadChildAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }

      await createChild({
        firstName: form.firstName,
        lastName: form.lastName,
        squadId: form.squadId,
        photoUrl,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentName: form.parentName.trim() || undefined,
        parentPhone: form.parentPhoneDigits ? `+380${form.parentPhoneDigits}` : undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
      })

      onClose()
    } catch {
      setSubmitError('Не вдалося завантажити фото або створити дитину')
    }
  }

  function handleAvatarSelect(file: File | null) {
    if (!file) {
      setAvatarFile(null)
      setAvatarPreviewUrl(null)
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('Фото має бути у форматі JPEG, PNG або WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Максимальний розмір фото: 5 MB')
      return
    }

    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Аватар дитини</label>
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer">
                  Обрати фото
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
                  />
                </label>
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="avatar preview" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">Фото не обрано</span>
                )}
              </div>
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

          {(error || submitError) && (
            <p className="text-red-500 text-sm">{submitError ?? 'Помилка. Перевірте дані.'}</p>
          )}

          <button type="submit" disabled={isPending || isPreparingAvatarUpload}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
            {isPending || isPreparingAvatarUpload ? 'Збереження...' : 'Зареєструвати'}
          </button>
        </form>
    </BottomSheet>
  )
}

export function ChildrenPage() {
  const { data: children, isLoading } = useChildren()
  const { data: squads } = useSquads()
  const { data: rules = [] } = useCoinRules()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [filterSquad, setFilterSquad] = useState<string>('')
  const [selectedChildOverride, setSelectedChildOverride] = useState<Child | null>(null)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  const [showBulkEarn, setShowBulkEarn] = useState(false)
  const selectedChildId = searchParams.get('childId')

  const filtered = filterSquad ? children?.filter((c) => c.squadId === filterSquad) : children
  const selectedChildren = useMemo(
    () => (filtered ?? []).filter((child) => selectedChildIds.includes(child.id)),
    [filtered, selectedChildIds],
  )
  const selectedChild = useMemo(() => {
    if (!selectedChildId) return null
    if (selectedChildOverride?.id === selectedChildId) return selectedChildOverride
    return children?.find((child) => child.id === selectedChildId) ?? null
  }, [children, selectedChildId, selectedChildOverride])

  function openChildDetails(child: Child) {
    setSelectedChildOverride(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('childId', child.id)
    setSearchParams(nextParams, { replace: Boolean(selectedChildId) })
  }

  function closeChildDetails() {
    setSelectedChildOverride(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: true })
  }

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
                openChildDetails(value)
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
          onClose={closeChildDetails}
          onChildUpdated={setSelectedChildOverride}
          onChildDeleted={closeChildDetails}
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
