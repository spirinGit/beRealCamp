import { useState } from 'react'
import { useBulkMarkAttendance, useMarkAttendance, useSquadAttendance } from '../../features/attendance'
import {
  type Child,
  uploadChildAvatarFile,
  useChildBalance,
  useChildren,
  useCreateChild,
  useCreateChildAvatarUploadUrl,
} from '../../features/children'
import { type Squad, useRenameSquad, useSquads } from '../../features/squads'
import { PhotoViewer } from '../../shared/ui'
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

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 9)
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

function AddChildSheet({ squad, onClose }: { squad: Squad; onClose: () => void }) {
  const { mutateAsync: createChild, isPending } = useCreateChild()
  const { mutateAsync: createAvatarUploadUrl, isPending: isPreparingAvatarUpload } = useCreateChildAvatarUploadUrl()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [parentName, setParentName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [parentPhoneTail, setParentPhoneTail] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && dateOfBirth.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    try {
      setSubmitError(null)
      let photoUrl: string | undefined

      if (avatarFile) {
        const target = await createAvatarUploadUrl({
          squadId: squad.id,
          fileName: avatarFile.name,
          contentType: avatarFile.type,
        })
        await uploadChildAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }

      await createChild({
        squadId: squad.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        parentName: parentName.trim() || undefined,
        photoUrl,
        dateOfBirth,
        gender,
        parentPhone: parentPhoneTail ? `+380${parentPhoneTail}` : undefined,
        medicalNotes: medicalNotes.trim() || undefined,
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
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Нова дитина</h2>
        <p className="text-sm text-gray-400 mt-1 mb-4">Загін: {squad.name}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
              placeholder="Ім'я"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200"
              placeholder="Прізвище"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Аватар дитини</p>
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

          <input
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            placeholder="Ім'я та прізвище батьків"
          />

          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-3 rounded-xl border font-medium ${gender === 'male' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'}`}
            >
              👦 Хлопець
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-3 rounded-xl border font-medium ${gender === 'female' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'}`}
            >
              👧 Дівчина
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Телефон батьків</p>
            <div className="flex items-center rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-gray-500 mr-2">+380</span>
              <input
                value={parentPhoneTail}
                onChange={(e) => setParentPhoneTail(normalizePhoneDigits(e.target.value))}
                inputMode="numeric"
                className="flex-1 outline-none bg-transparent"
                placeholder="XXXXXXXXX"
              />
            </div>
          </div>

          <textarea
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 min-h-24"
            placeholder="Медичні примітки"
          />

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={!canSubmit || isPending || isPreparingAvatarUpload}
            className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isPending || isPreparingAvatarUpload ? 'Створення...' : 'Додати дитину'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RenameSquadSheet({ squad, onClose }: { squad: Squad; onClose: () => void }) {
  const { mutate, isPending } = useRenameSquad(squad.id)
  const [name, setName] = useState(squad.name)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    mutate(trimmed, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Змінити назву загону</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            placeholder="Нова назва загону"
            required
          />
          <button
            type="submit"
            disabled={isPending || name.trim().length === 0}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isPending ? 'Збереження...' : 'Зберегти'}
          </button>
        </form>
      </div>
    </div>
  )
}

function EarnSheet({
  child,
  squadId,
  rules,
  penalties,
  attendanceDays,
  attendanceToday,
  attendanceRecords,
  joinedAt,
  onClose,
}: {
  child: Child
  squadId: string
  rules: CoinRule[]
  penalties: CoinRule[]
  attendanceDays: string[]
  attendanceToday: string
  attendanceRecords: Record<string, boolean>
  joinedAt: string
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
  const [showAttendance, setShowAttendance] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const { mutate, isPending } = useEarnTalents()
  const { mutate: spend, isPending: isSpending } = useSpendTalents()
  const { mutate: markAttendance, isPending: isMarkingAttendance } = useMarkAttendance(squadId)
  const { data: balance = 0 } = useChildBalance(child.id)

  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0
  const spendAmount = penaltyMode === 'preset' ? Math.abs(penaltySelected?.points ?? 0) : Number(penaltyCustomAmount) || 0
  const canSpend = penaltyMode === 'preset' ? !!penaltySelected : !!penaltyCustomReason && spendAmount > 0
  const joinedDay = formatDayKey(new Date(joinedAt))
  const canMarkToday = attendanceToday.length > 0 && attendanceDays.includes(attendanceToday) && joinedDay <= attendanceToday

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

  function handleMarkAttendance(isPresent: boolean) {
    if (!attendanceToday) return
    markAttendance({ childId: child.id, day: attendanceToday, isPresent })
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden cursor-pointer"
                onClick={() => child.photoUrl && setPhotoOpen(true)}
              >
                {child.photoUrl
                  ? <img src={child.photoUrl} alt={child.firstName} className="w-full h-full object-cover" />
                  : <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                }
              </div>
              {photoOpen && child.photoUrl && (
                <PhotoViewer src={child.photoUrl} alt={child.firstName} onClose={() => setPhotoOpen(false)} />
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Нарахування</p>
                <h2 className="text-2xl font-bold text-gray-900">{child.firstName}</h2>
                <p className="text-lg font-semibold text-gray-600">{child.lastName}</p>
              </div>
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
          {attendanceDays.length > 0 && (
            <>
              <button
                onClick={() => setShowAttendance((prev) => !prev)}
                className="w-full mt-3 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-base"
              >
                {showAttendance ? 'Сховати відвідуваність' : 'Показати відвідуваність'}
              </button>

              {showAttendance && (
                <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-gray-700">Відвідуваність</p>
                    <p className="text-xs text-gray-400">Дні табору</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendanceDays.map((day) => {
                      const state = attendanceState(day, attendanceToday, joinedAt, attendanceRecords)
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
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => handleMarkAttendance(true)}
                      disabled={isMarkingAttendance || !canMarkToday}
                      className="bg-green-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50"
                    >
                      {isMarkingAttendance ? 'Збереження...' : 'Присутній сьогодні'}
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(false)}
                      disabled={isMarkingAttendance || !canMarkToday}
                      className="bg-red-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50"
                    >
                      {isMarkingAttendance ? 'Збереження...' : 'Відсутній сьогодні'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
  const { data: attendanceOverview } = useSquadAttendance(squad.id)
  const { mutate: bulkMarkAttendance, isPending: isBulkMarkingAttendance } = useBulkMarkAttendance(squad.id)
  const [earnFor, setEarnFor] = useState<Child | null>(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPenaltyOpen, setBulkPenaltyOpen] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])

  const childList = children ?? []
  const selectedChildren = childList.filter((child) => selectedChildIds.includes(child.id))
  const canMarkToday = !!attendanceOverview?.today && attendanceOverview.days.includes(attendanceOverview.today)
  const eligibleSelectedChildIds =
    attendanceOverview && canMarkToday
      ? selectedChildren
          .filter((child) => {
            const joinedAt =
              attendanceOverview.children.find((attendanceChild) => attendanceChild.id === child.id)?.createdAt ??
              child.createdAt
            return formatDayKey(new Date(joinedAt)) <= attendanceOverview.today
          })
          .map((child) => child.id)
      : []

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

  function handleBulkMarkPresent() {
    if (!attendanceOverview || eligibleSelectedChildIds.length === 0) return
    bulkMarkAttendance(
      {
        childIds: eligibleSelectedChildIds,
        day: attendanceOverview.today,
        isPresent: true,
      },
      {
        onSuccess: () => {
          clearSelectedChildren()
        },
      },
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-gray-400">Всього дітей</p>
          <p className="text-lg font-bold text-gray-900">{attendanceOverview?.totals.totalChildren ?? childList.length}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-gray-400">Присутні сьогодні</p>
          <p className="text-lg font-bold text-green-600">
            {attendanceOverview ? `${attendanceOverview.totals.presentToday}/${attendanceOverview.totals.applicableToday}` : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAddChild(true)}
          className="px-3 py-1.5 rounded-full bg-violet-600 text-white text-xs font-semibold"
        >
          + Додати дитину
        </button>

        {!isLoading && childList.length > 0 && !isBulkMode && (
          <button onClick={startBulkSelection} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600">
            Вибрати всіх
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ) : childList.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">Дітей у загоні ще немає</p>
      ) : (
        <>
          {isBulkMode ? (
            <div className="flex items-center gap-2">
              <button onClick={clearSelectedChildren} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600">Очистити</button>
              <button
                onClick={handleBulkMarkPresent}
                disabled={eligibleSelectedChildIds.length === 0 || isBulkMarkingAttendance}
                className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isBulkMarkingAttendance
                  ? 'Збереження...'
                  : `Відмітити присутніми (${eligibleSelectedChildIds.length})`}
              </button>
              <button onClick={() => setBulkOpen(true)} disabled={selectedChildren.length === 0} className="ml-auto px-3 py-1.5 rounded-full bg-violet-600 text-white text-xs font-semibold disabled:opacity-50">Нарахувати бали ({selectedChildren.length})</button>
              <button onClick={() => setBulkPenaltyOpen(true)} disabled={selectedChildren.length === 0} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold disabled:opacity-50">Зняти бали ({selectedChildren.length})</button>
            </div>
          ) : null}

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
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {child.photoUrl
                      ? <img src={child.photoUrl} alt={child.firstName} className="w-full h-full object-cover" />
                      : <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                    }
                  </div>
                  <div className="flex-1"><p className="font-medium text-gray-900 text-sm">{child.firstName} {child.lastName}</p></div>
                  {isBulkMode ? <span className={`text-lg ${isSelected ? 'text-violet-600' : 'text-gray-300'}`}>{isSelected ? '☑' : '☐'}</span> : <span className="text-gray-300 text-lg">›</span>}
                </button>
                {!isBulkMode && <button onClick={() => setEarnFor(child)} className="px-2 py-1 rounded-lg text-violet-600 text-sm font-semibold">⭐</button>}
              </div>
            )
          })}
        </>
      )}

      {showAddChild && <AddChildSheet squad={squad} onClose={() => setShowAddChild(false)} />}
      {earnFor && (
        <EarnSheet
          child={earnFor}
          squadId={squad.id}
          rules={rules}
          penalties={penalties}
          attendanceDays={attendanceOverview?.days ?? []}
          attendanceToday={attendanceOverview?.today ?? ''}
          attendanceRecords={attendanceOverview?.children.find((child) => child.id === earnFor.id)?.attendance ?? {}}
          joinedAt={attendanceOverview?.children.find((child) => child.id === earnFor.id)?.createdAt ?? earnFor.createdAt}
          onClose={() => setEarnFor(null)}
        />
      )}
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
  const [renamingSquad, setRenamingSquad] = useState<Squad | null>(null)

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
              <div className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 text-left">
                <button
                  type="button"
                  onClick={() => setOpenSquad(openSquad === squad.id ? null : squad.id)}
                  className="flex items-center gap-4 text-left flex-1 min-w-0"
                >
                  <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: squad.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{squad.name}</p>
                    {squad.description && <p className="text-sm text-gray-400 truncate">{squad.description}</p>}
                  </div>
                  <span className={`text-gray-400 text-lg transition-transform ${openSquad === squad.id ? 'rotate-90' : ''}`}>›</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingSquad(squad)}
                  className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium"
                >
                  Назва
                </button>
              </div>
              {openSquad === squad.id && <SquadChildren squad={squad} rules={rules} penalties={penalties} />}
            </div>
          ))}
        </div>
      )}
      {renamingSquad && <RenameSquadSheet squad={renamingSquad} onClose={() => setRenamingSquad(null)} />}
    </div>
  )
}
