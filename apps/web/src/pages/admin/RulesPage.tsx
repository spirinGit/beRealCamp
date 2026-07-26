import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { apiClient } from '../../shared/api/client'
import { BottomSheet } from '../../shared/ui'

interface CoinRule {
  id: string
  key: string
  label: string
  description: string | null
  photoUrl: string | null
  isAchievement: boolean
  points: number
  isActive: boolean
}

interface RuleUploadTarget {
  uploadUrl: string
  photoUrl: string
  objectKey: string
  expiresInSeconds: number
  allowedContentTypes: string[]
}

function uploadRuleFile(uploadUrl: string, file: File) {
  return fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  }).then((res) => {
    if (!res.ok) throw new Error('Upload failed')
  })
}

function useRules() {
  const { effectiveCampId } = useAuth()
  return useQuery({
    queryKey: ['coin-rules', effectiveCampId],
    queryFn: async () => {
      const { data } = await apiClient.get<CoinRule[]>(`/coin-rules?campId=${effectiveCampId}`)
      return data
    },
    enabled: !!effectiveCampId,
  })
}

function useToggleRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/coin-rules/${id}/toggle`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-rules'] }),
  })
}

function useCreateRule() {
  const { effectiveCampId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { label: string; points: number; description?: string; photoUrl?: string; isAchievement?: boolean }) => {
      const { data } = await apiClient.post('/coin-rules', {
        ...body,
        key: body.label.toLowerCase().replace(/\s+/g, '_'),
        campId: effectiveCampId!,
      })
      return data as CoinRule
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-rules'] }),
  })
}

function useUpdateRule(ruleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { label: string; points: number; description?: string | null; photoUrl?: string | null; isAchievement?: boolean }) => {
      const { data } = await apiClient.patch(`/coin-rules/${ruleId}`, {
        ...body,
        key: body.label.toLowerCase().replace(/\s+/g, '_'),
      })
      return data as CoinRule
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-rules'] }),
  })
}

function useCreateRuleAvatarUploadUrl() {
  return useMutation({
    mutationFn: async (contentType: string) => {
      const { data } = await apiClient.post<RuleUploadTarget>('/coin-rules/avatar-upload-url', { contentType })
      return data
    },
  })
}

function RuleRow({ rule, onEdit }: { rule: CoinRule; onEdit: (rule: CoinRule) => void }) {
  const { mutate: toggle, isPending } = useToggleRule()
  return (
    <div className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 ${!rule.isActive ? 'opacity-50' : ''}`}>
      <div className="w-12 h-12 rounded-xl bg-violet-100 overflow-hidden flex items-center justify-center text-lg flex-shrink-0">
        {rule.photoUrl ? (
          <img src={rule.photoUrl} alt={rule.label} className="w-full h-full object-cover" />
        ) : (
          <span>⭐</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{rule.label}</p>
        {rule.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rule.description}</p>}
        <p className="text-xs text-violet-600 font-semibold mt-0.5">+{rule.points} коінів</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(rule)}
        className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors"
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={() => toggle(rule.id)}
        disabled={isPending}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors ${
          rule.isActive
            ? 'bg-gray-100 text-gray-500 active:bg-red-50 active:text-red-500'
            : 'bg-green-100 text-green-600'
        }`}
      >
        {rule.isActive ? 'Вимкнути' : 'Увімкнути'}
      </button>
    </div>
  )
}

function RuleSheet({ rule, onClose }: { rule?: CoinRule; onClose: () => void }) {
  const isEdit = !!rule
  const [label, setLabel] = useState(rule?.label ?? '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [points, setPoints] = useState(String(rule?.points ?? ''))
  const [isAchievement, setIsAchievement] = useState(rule?.isAchievement ?? false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createMutation = useCreateRule()
  const updateMutation = useUpdateRule(rule?.id ?? '')
  const uploadMutation = useCreateRuleAvatarUploadUrl()

  function handleAvatarSelect(file: File | null) {
    if (!file) {
      setAvatarFile(null)
      setAvatarPreviewUrl(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('JPEG, PNG або WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Максимум 5 MB')
      return
    }
    setSubmitError(null)
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    try {
      let photoUrl = rule?.photoUrl ?? undefined
      if (avatarFile) {
        const target = await uploadMutation.mutateAsync(avatarFile.type)
        await uploadRuleFile(target.uploadUrl, avatarFile)
        photoUrl = target.photoUrl
      }

      const body = {
        label: label.trim(),
        points: Number(points),
        description: description.trim() || undefined,
        isAchievement,
        ...(photoUrl ? { photoUrl } : {}),
      }

      if (isEdit && rule) {
        await updateMutation.mutateAsync({
          ...body,
          description: body.description ?? null,
          photoUrl: photoUrl ?? null,
        })
      } else {
        await createMutation.mutateAsync(body)
      }

      onClose()
    } catch {
      setSubmitError('Помилка збереження')
    }
  }

  const displayPhoto = avatarPreviewUrl ?? rule?.photoUrl ?? null
  const isSaving = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending

  return (
    <BottomSheet onClose={onClose} className="p-6 space-y-4">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
      <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Редагувати правило' : 'Нове правило'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {displayPhoto ? <img src={displayPhoto} alt={label || 'Правило'} className="w-full h-full object-cover" /> : <span>⭐</span>}
            </div>
            <label className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer active:bg-gray-50">
              {displayPhoto ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Назва правила *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Командна робота, Добрі справи..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="За що саме нараховується" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Кількість коінів *</label>
          <input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="1000" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isAchievement}
            onChange={(e) => setIsAchievement(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          Це ачівка
        </label>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        <button type="submit" disabled={isSaving} className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-base disabled:opacity-50 active:scale-95 transition-transform">
          {isSaving ? 'Збереження...' : 'Зберегти'}
        </button>
      </form>
    </BottomSheet>
  )
}

export function RulesPage() {
  const { data: rules, isLoading } = useRules()
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<CoinRule | null>(null)
  const navigate = useNavigate()

  const active = rules?.filter((r) => r.isActive && r.points > 0) ?? []
  const inactive = rules?.filter((r) => !r.isActive && r.points > 0) ?? []

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/admin/more')} className="text-gray-400 text-2xl active:text-gray-600">‹</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Правила</h1>
          <p className="text-sm text-gray-400 mt-0.5">{active.length} активних пресетів</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="w-11 h-11 bg-violet-600 text-white rounded-full text-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
          +
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : rules?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium">Правил ще немає</p>
          <p className="text-sm mt-1">Натисніть + щоб додати перший пресет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((r) => <RuleRow key={r.id} rule={r} onEdit={setEditingRule} />)}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-4 mb-2">Вимкнені</p>
              {inactive.map((r) => <RuleRow key={r.id} rule={r} onEdit={setEditingRule} />)}
            </>
          )}
        </div>
      )}

      {showCreate && <RuleSheet onClose={() => setShowCreate(false)} />}
      {editingRule && <RuleSheet rule={editingRule} onClose={() => setEditingRule(null)} />}
    </div>
  )
}
