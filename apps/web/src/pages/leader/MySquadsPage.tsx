import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCurrentCampPublicCode } from '../../features/camps'
import { useBulkMarkAttendance, useMarkAttendance, useSquadAttendance } from '../../features/attendance'
import {
  type Child,
  uploadChildAvatarFile,
  useChildBalance,
  useChildren,
  useCreateChild,
  useCreateChildAvatarUploadUrl,
  useDeleteChild,
  useUpdateChild,
} from '../../features/children'
import { type Squad, useCreateSquadAvatarUploadUrl, useSquads, useUpdateSquad } from '../../features/squads'
import { BottomSheet, PhotoViewer, Toast } from '../../shared/ui'
import {
  type CoinRule,
  useBulkEarnCoins,
  useBulkSpendCoins,
  useCoinRules,
  useEarnCoins,
  usePenaltyRules,
  useSpendCoins,
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

async function uploadSquadAvatarFile(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!res.ok) throw new Error('Upload failed')
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
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
    <BottomSheet onClose={onClose} zIndex="z-30" className="max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8">
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
                >
                  📷 Камера
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
                >
                  🖼️ Галерея
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
                />
              </div>
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
    </BottomSheet>
  )
}

function LeaderEditSquadSheet({ squad, onClose }: { squad: Squad; onClose: () => void }) {
  const [name, setName] = useState(squad.name)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutateAsync: updateSquad, isPending } = useUpdateSquad(squad.id)
  const { mutateAsync: createAvatarUploadUrl, isPending: isUploading } = useCreateSquadAvatarUploadUrl()

  function handleAvatarSelect(file: File | null) {
    if (!file) { setAvatarFile(null); setAvatarPreviewUrl(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSubmitError('JPEG, PNG або WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Максимум 5 MB'); return }
    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitError(null)
    try {
      let photoUrl: string | undefined
      if (avatarFile) {
        const target = await createAvatarUploadUrl({ contentType: avatarFile.type })
        await uploadSquadAvatarFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }
      await updateSquad({ name: name.trim(), ...(photoUrl ? { photoUrl } : {}) })
      onClose()
    } catch {
      setSubmitError('Помилка збереження')
    }
  }

  const displayPhoto = avatarPreviewUrl ?? squad.photoUrl

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
      <p className="text-lg font-bold text-gray-900">Редагувати загін</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото загону</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: squad.color }}>
              {displayPhoto && <img src={displayPhoto} alt={squad.name} className="w-full h-full object-cover" />}
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {squad.photoUrl || avatarPreviewUrl ? 'Змінити фото в галереї' : 'Додати фото з галереї'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Назва загону" />
        </div>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isPending || isUploading}
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
          {isPending || isUploading ? 'Збереження...' : 'Зберегти'}
        </button>
      </form>
    </BottomSheet>
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
  const [showEditChild, setShowEditChild] = useState(false)
  const [showAchievementsForm, setShowAchievementsForm] = useState(false)
  const [selectedAchievementRuleId, setSelectedAchievementRuleId] = useState<string | null>(null)
  const [achievementComment, setAchievementComment] = useState('')
  const [photoOpen, setPhotoOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const navigate = useNavigate()
  const { data: currentCampData } = useCurrentCampPublicCode()
  const { mutate, isPending } = useEarnCoins()
  const { mutate: spend, isPending: isSpending } = useSpendCoins()
  const { mutate: markAttendance, isPending: isMarkingAttendance } = useMarkAttendance(squadId)
  const { data: balance = 0 } = useChildBalance(child.id)

  const regularRules = rules.filter((r) => !r.isAchievement) ?? []
  const achievementRules = rules.filter((r) => r.isAchievement) ?? []
  const selectedAchievementRule = achievementRules.find((r) => r.id === selectedAchievementRuleId) ?? null
  const achievementAmount = selectedAchievementRule?.points ?? 0
  const achievementReason = selectedAchievementRule?.label ?? ''
  const achievementMetadata = selectedAchievementRule ? { isAchievement: true, achievementKey: `rule:${selectedAchievementRule.id}`, ...(selectedAchievementRule.photoUrl ? { rulePhotoUrl: selectedAchievementRule.photoUrl } : {}), ...(selectedAchievementRule.description ? { ruleDescription: selectedAchievementRule.description } : {}) } : {}
  const canSubmitAchievement = achievementAmount > 0 && achievementReason.length > 0

  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0
  const spendAmount = penaltyMode === 'preset' ? Math.abs(penaltySelected?.points ?? 0) : Number(penaltyCustomAmount) || 0
  const canSpend = penaltyMode === 'preset' ? !!penaltySelected : !!penaltyCustomReason && spendAmount > 0
  const earnReason = mode === 'preset' ? selected?.label ?? '' : customReason
  const shouldMarkAchievement = mode === 'preset' && selected?.isAchievement === true
  const earnMetadata = {
    ...(selected?.photoUrl ? { rulePhotoUrl: selected.photoUrl } : {}),
    ...(selected?.description ? { ruleDescription: selected.description } : {}),
    ...(shouldMarkAchievement
      ? {
          isAchievement: true,
          achievementKey: mode === 'preset' && selected ? `rule:${selected.id}` : earnReason.trim().toLowerCase(),
        }
      : {}),
  }
  const penaltyMetadata = penaltySelected?.photoUrl || penaltySelected?.description
    ? { rulePhotoUrl: penaltySelected.photoUrl, ruleDescription: penaltySelected.description ?? undefined }
    : undefined
  const joinedDay = formatDayKey(new Date(joinedAt))
  const canMarkToday = attendanceToday.length > 0 && attendanceDays.includes(attendanceToday) && joinedDay <= attendanceToday

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate(
      {
        childId: child.id,
        amount: earnAmount,
        reason,
        comment: comment || undefined,
        metadata: Object.keys(earnMetadata).length > 0 ? earnMetadata : undefined,
      },
      {
        onSuccess: () => {
          setToast({ message: `Нараховано +${earnAmount} ⭐`, type: 'success' })
          setTimeout(() => {
            setShowAwardForm(false)
            onClose()
          }, 2000)
        },
        onError: () => {
          setToast({ message: 'Помилка при нарахуванні балів', type: 'error' })
        },
      },
    )
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
        metadata: penaltyMetadata,
      },
      {
        onSuccess: () => {
          setToast({ message: `Знято -${spendAmount} ⭐`, type: 'success' })
          setTimeout(() => {
            setShowPenaltyForm(false)
            onClose()
          }, 2000)
        },
        onError: () => {
          setToast({ message: 'Помилка при знятті балів', type: 'error' })
        },
      },
    )
  }

  function handleAchievementSubmit() {
    if (!canSubmitAchievement) return
    mutate(
      {
        childId: child.id,
        amount: achievementAmount,
        reason: achievementReason,
        comment: achievementComment.trim() || undefined,
        metadata: Object.keys(achievementMetadata).length > 0 ? achievementMetadata : undefined,
      },
      {
        onSuccess: () => {
          setToast({ message: `🏆 Досягнення нараховано! +${achievementAmount} ⭐`, type: 'success' })
          setTimeout(() => {
            setSelectedAchievementRuleId(null)
            setAchievementComment('')
            setShowAchievementsForm(false)
            onClose()
          }, 2000)
        },
        onError: () => {
          setToast({ message: 'Помилка при нарахуванні досягнення', type: 'error' })
        },
      },
    )
  }

  function handleMarkAttendance(isPresent: boolean) {
    if (!attendanceToday) return
    markAttendance({ childId: child.id, day: attendanceToday, isPresent })
  }

  function handleViewProfile() {
    if (!currentCampData?.publicAccessCode) return
    navigate(`/child/profile?code=${currentCampData.publicAccessCode}&childId=${child.id}`)
  }

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="max-h-[92dvh] overflow-y-auto">
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
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setShowEditChild(true)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl leading-none font-bold"
              ><span className="-mt-1">...</span>
              </button>
              <div className="bg-violet-50 rounded-2xl px-4 py-3 text-right">
                <p className="text-xs text-violet-400 mb-0.5">Баланс</p>
                <p className="text-xl font-bold text-violet-600">⭐ {balance}</p>
              </div>
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
            onClick={() => { setShowAwardForm(!showAwardForm); setShowPenaltyForm(false); setShowAchievementsForm(false) }}
            className="w-full mt-3 bg-violet-600 text-white font-semibold py-3 rounded-xl text-base"
          >
            Нарахувати бали
          </button>
          <button
            onClick={() => { setShowPenaltyForm(!showPenaltyForm); setShowAwardForm(false); setShowAchievementsForm(false) }}
            className="w-full mt-2 bg-red-600 text-white font-semibold py-3 rounded-xl text-base"
          >
            Зняти бали
          </button>
          <button
            onClick={() => { setShowAchievementsForm(!showAchievementsForm); setShowAwardForm(false); setShowPenaltyForm(false) }}
            className="w-full mt-2 bg-yellow-600 text-white font-semibold py-3 rounded-xl text-base"
          >
            🏆 Нарахувати досягнення
          </button>
          <button
            onClick={handleViewProfile}
            disabled={!currentCampData?.publicAccessCode}
            className="w-full mt-2 bg-purple-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50"
          >
            👁️ Переглянути публічний профіль
          </button>
        </div>

        {showAwardForm && (
          <div className="px-6 pb-8 space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setMode('preset')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'preset' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Пресет</button>
              <button onClick={() => setMode('custom')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'custom' ? 'bg-white text-violet-700' : 'text-gray-500'}`}>Власне</button>
            </div>

            {mode === 'preset' ? (
              regularRules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Правил нарахування ще немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {regularRules.map((rule) => (
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
        {showAchievementsForm && (
          <div className="px-6 pb-8 space-y-4">
            {achievementRules.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Досягнень поки немає</p>
            ) : (
              <div className="space-y-2">
                {achievementRules.map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedAchievementRuleId(selectedAchievementRuleId === rule.id ? null : rule.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedAchievementRuleId === rule.id
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{rule.label}</p>
                        {rule.description && <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>}
                      </div>
                      <p className="text-sm font-bold">+{rule.points}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedAchievementRule && (
              <input
                value={achievementComment}
                onChange={(e) => setAchievementComment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Коментар (необов'язково)"
              />
            )}

            <button
              onClick={handleAchievementSubmit}
              disabled={!canSubmitAchievement || isPending}
              className="w-full bg-yellow-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {isPending ? 'Збереження...' : `Нарахувати${achievementAmount > 0 ? ` +${achievementAmount}` : ''} 🏆`}
            </button>
          </div>
        )}
      {showEditChild && (
        <LeaderEditChildSheet
          child={child}
          onClose={() => setShowEditChild(false)}
          onDeleted={() => {
            setShowEditChild(false)
            onClose()
          }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </BottomSheet>
  )
}

function LeaderEditChildSheet({ child, onClose, onDeleted }: { child: Child; onClose: () => void; onDeleted: () => void }) {
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
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
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
      await updateChild({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentName: form.parentName.trim() || undefined,
        parentPhone: form.parentPhoneDigits ? `+380${form.parentPhoneDigits}` : undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
        ...(photoUrl ? { photoUrl } : {}),
      })
      onClose()
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
    <BottomSheet onClose={onClose} zIndex="z-40" className="p-6 space-y-4 max-h-[92dvh] overflow-y-auto">
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
              >
                📷 Камера
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
              >
                🖼️ Галерея
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              />
            </div>
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
            <input type="text" inputMode="numeric"
              value={form.parentPhoneDigits}
              onChange={(e) => set('parentPhoneDigits', e.target.value.replace(/\D/g, '').slice(0, 9))}
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

function BulkEarnSheet({ children, rules, onClose }: { children: Child[]; rules: CoinRule[]; onClose: () => void }) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { mutate, isPending } = useBulkEarnCoins()
  const earnAmount = mode === 'preset' ? (selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && earnAmount > 0
  const shouldMarkAchievement = mode === 'preset' && selected?.isAchievement === true

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    const metadata = {
      ...(selected?.photoUrl ? { rulePhotoUrl: selected.photoUrl } : {}),
      ...(selected?.description ? { ruleDescription: selected.description } : {}),
      ...(shouldMarkAchievement
        ? {
            isAchievement: true,
            achievementKey: mode === 'preset' && selected ? `rule:${selected.id}` : reason.trim().toLowerCase(),
          }
        : {}),
    }
    mutate(
      {
        childIds: children.map((c) => c.id),
        amount: earnAmount,
        reason,
        comment: comment || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
      {
        onSuccess: (result: any) => {
          setToast({ message: `✅ Нараховано +${earnAmount} ⭐ для ${result.count} дітей`, type: 'success' })
          setTimeout(() => {
            onClose()
          }, 2000)
        },
        onError: (error: any) => {
          const errorMsg = error?.response?.data?.error || 'Помилка при масовому нарахуванні'
          setToast({ message: `❌ ${errorMsg}`, type: 'error' })
        },
      },
    )
  }

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8 space-y-4">
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </BottomSheet>
  )
}

function BulkPenaltySheet({ children, rules, onClose }: { children: Child[]; rules: CoinRule[]; onClose: () => void }) {
  const [selected, setSelected] = useState<CoinRule | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { mutate, isPending } = useBulkSpendCoins()
  const spendAmount = mode === 'preset' ? Math.abs(selected?.points ?? 0) : Number(customAmount) || 0
  const canSubmit = mode === 'preset' ? !!selected : !!customReason && spendAmount > 0

  function handleSubmit() {
    if (!canSubmit) return
    const reason = mode === 'preset' ? selected!.label : customReason
    mutate(
      {
        childIds: children.map((c) => c.id),
        amount: spendAmount,
        reason,
        comment: comment || undefined,
        metadata: selected?.photoUrl || selected?.description ? { rulePhotoUrl: selected.photoUrl, ruleDescription: selected.description ?? undefined } : undefined,
      },
      {
        onSuccess: (result: any) => {
          setToast({ message: `✅ Знято -${spendAmount} ⭐ для ${result.count} дітей`, type: 'success' })
          setTimeout(() => {
            onClose()
          }, 2000)
        },
        onError: (error: any) => {
          const errorMsg = error?.response?.data?.error || 'Помилка при масовому покаранні'
          setToast({ message: `❌ ${errorMsg}`, type: 'error' })
        },
      },
    )
  }

  return (
    <BottomSheet onClose={onClose} zIndex="z-30" className="max-h-[92dvh] overflow-y-auto px-6 pt-6 pb-8 space-y-4">
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </BottomSheet>
  )
}

function SquadChildren({
  squad,
  rules,
  penalties,
  selectedChildId,
  onOpenChild,
  onCloseChild,
}: {
  squad: Squad
  rules: CoinRule[]
  penalties: CoinRule[]
  selectedChildId: string | null
  onOpenChild: (child: Child) => void
  onCloseChild: () => void
}) {
  const { data: children, isLoading } = useChildren(squad.id)
  const { data: attendanceOverview } = useSquadAttendance(squad.id)
  const { mutate: bulkMarkAttendance, isPending: isBulkMarkingAttendance } = useBulkMarkAttendance(squad.id)
  const [showAddChild, setShowAddChild] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPenaltyOpen, setBulkPenaltyOpen] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<'firstName' | 'lastName'>('firstName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const childList = useMemo(() => {
    const list = [...(children ?? [])]
    const direction = sortDirection === 'asc' ? 1 : -1

    return list.sort((a, b) => {
      const left = (a[sortField] ?? '').toString().trim().toLowerCase()
      const right = (b[sortField] ?? '').toString().trim().toLowerCase()
      const bySelectedField = left.localeCompare(right, 'uk') * direction
      if (bySelectedField !== 0) return bySelectedField

      const fallbackLeft = a.firstName.trim().toLowerCase() + ' ' + a.lastName.trim().toLowerCase()
      const fallbackRight = b.firstName.trim().toLowerCase() + ' ' + b.lastName.trim().toLowerCase()
      return fallbackLeft.localeCompare(fallbackRight, 'uk') * direction
    })
  }, [children, sortDirection, sortField])

  const earnFor = selectedChildId ? childList.find((child) => child.id === selectedChildId) ?? null : null
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

      {!isLoading && childList.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (sortField === 'firstName') {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
              } else {
                setSortField('firstName')
                setSortDirection('asc')
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              sortField === 'firstName'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            Ім&apos;я {sortField === 'firstName' ? (sortDirection === 'asc' ? 'A→Z' : 'Z→A') : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              if (sortField === 'lastName') {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
              } else {
                setSortField('lastName')
                setSortDirection('asc')
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              sortField === 'lastName'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            Прізвище {sortField === 'lastName' ? (sortDirection === 'asc' ? 'A→Z' : 'Z→A') : ''}
          </button>
        </div>
      )}

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
                      onOpenChild(child)
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
                {!isBulkMode && <button onClick={() => onOpenChild(child)} className="px-2 py-1 rounded-lg text-violet-600 text-sm font-semibold">⭐</button>}
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
          onClose={onCloseChild}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null)
  const [viewingSquadPhotoUrl, setViewingSquadPhotoUrl] = useState<string | null>(null)
  const openSquad = searchParams.get('squadId')
  const openChildId = searchParams.get('childId')

  const squadList = squads ?? []

  function toggleSquad(squadId: string) {
    const nextParams = new URLSearchParams(searchParams)
    const isOpen = openSquad === squadId

    if (isOpen) {
      nextParams.delete('squadId')
      nextParams.delete('childId')
      setSearchParams(nextParams, { replace: true })
      return
    }

    nextParams.set('squadId', squadId)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: Boolean(openSquad) })
  }

  function openChildSheet(squadId: string, child: Child) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('squadId', squadId)
    nextParams.set('childId', child.id)
    setSearchParams(nextParams, { replace: Boolean(openChildId) })
  }

  function closeChildSheet() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('childId')
    setSearchParams(nextParams, { replace: true })
  }

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
                  onClick={() => toggleSquad(squad.id)}
                  className="flex items-center gap-4 text-left flex-1 min-w-0"
                >
                <button
                  type="button"
                  onClick={() => squad.photoUrl && setViewingSquadPhotoUrl(squad.photoUrl)}
                  className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                  style={{ backgroundColor: squad.color }}
                >
                    {squad.photoUrl && <img src={squad.photoUrl} alt={squad.name} className="w-full h-full object-cover" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{squad.name}</p>
                    {squad.description && <p className="text-sm text-gray-400 truncate">{squad.description}</p>}
                  </div>
                  <span className={`text-gray-400 text-lg transition-transform ${openSquad === squad.id ? 'rotate-90' : ''}`}>›</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSquad(squad)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-bold"
                >
                  ⋮
                </button>
              </div>
              {openSquad === squad.id && (
                <SquadChildren
                  squad={squad}
                  rules={rules}
                  penalties={penalties}
                  selectedChildId={openChildId}
                  onOpenChild={(child) => openChildSheet(squad.id, child)}
                  onCloseChild={closeChildSheet}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {editingSquad && <LeaderEditSquadSheet squad={editingSquad} onClose={() => setEditingSquad(null)} />}
      {viewingSquadPhotoUrl && <PhotoViewer src={viewingSquadPhotoUrl} onClose={() => setViewingSquadPhotoUrl(null)} />}
    </div>
  )
}
