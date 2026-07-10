import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../../features/auth/AuthContext'
import { useCamps, useEnsurePublicCampLink, useUpdateCampChildGuidelines } from '../../features/camps'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PublicCampLinkPage() {
  const { effectiveCampId } = useAuth()
  const { data: camps = [] } = useCamps()
  const { mutate, isPending, error } = useEnsurePublicCampLink(effectiveCampId)
  const {
    mutate: saveGuidelines,
    isPending: isSavingGuidelines,
    error: saveGuidelinesError,
  } = useUpdateCampChildGuidelines(effectiveCampId)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle')
  const [guidelines, setGuidelines] = useState('')
  const [guidelinesState, setGuidelinesState] = useState<'idle' | 'done'>('idle')

  const activeCamp = useMemo(
    () => camps.find((camp) => camp.id === effectiveCampId) ?? null,
    [camps, effectiveCampId],
  )

  const publicUrl = useMemo(() => {
    if (!activeCamp?.publicAccessCode) return ''
    return `${window.location.origin}/child/search?code=${activeCamp.publicAccessCode}`
  }, [activeCamp?.publicAccessCode])

  useEffect(() => {
    setGuidelines(activeCamp?.childGuidelines ?? '')
  }, [activeCamp?.childGuidelines])

  useEffect(() => {
    let cancelled = false

    async function buildQrCode() {
      if (!publicUrl) {
        setQrCodeUrl('')
        return
      }

      const nextUrl = await QRCode.toDataURL(publicUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
      })

      if (!cancelled) {
        setQrCodeUrl(nextUrl)
      }
    }

    buildQrCode()

    return () => {
      cancelled = true
    }
  }, [publicUrl])

  async function handleCopy() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopyState('done')
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  function handleDownloadQr() {
    if (!qrCodeUrl || !activeCamp) return
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${activeCamp.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.click()
  }

  function handlePrintPdf() {
    if (!publicUrl || !qrCodeUrl || !activeCamp) return

    const popup = window.open('', '_blank', 'width=800,height=900')
    if (!popup) return

    popup.document.write(`
      <!doctype html>
      <html lang="uk">
        <head>
          <meta charset="utf-8" />
          <title>Посилання для дітей</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }
            .card {
              max-width: 640px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              padding: 32px;
              text-align: center;
            }
            img {
              width: 280px;
              height: 280px;
              margin: 24px auto;
              display: block;
            }
            .link {
              word-break: break-word;
              font-size: 14px;
              color: #4f46e5;
            }
            .meta {
              margin-top: 12px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Посилання для дітей</h1>
            <p><strong>${activeCamp.name}</strong></p>
            <p class="meta">${formatDate(activeCamp.startDate)} - ${formatDate(activeCamp.endDate)}</p>
            <img src="${qrCodeUrl}" alt="QR code" />
            <p class="link">${publicUrl}</p>
          </div>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  function handleSaveGuidelines() {
    saveGuidelines(guidelines, {
      onSuccess: () => {
        setGuidelinesState('done')
        window.setTimeout(() => setGuidelinesState('idle'), 2000)
      },
    })
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Посилання для дітей</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Діти зможуть без логіну відкрити табір, знайти свій загін і побачити бали
        </p>
      </div>

      {!activeCamp ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-sm text-gray-500">
          Спочатку оберіть активний табір.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Поточний табір</p>
            <p className="text-lg font-semibold text-gray-900">{activeCamp.name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(activeCamp.startDate)} - {formatDate(activeCamp.endDate)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div>
              <p className="font-semibold text-gray-900">Загальні положення для дітей</p>
              <p className="text-sm text-gray-500 mt-1">
                Цей текст буде видимий дітям у публічному кабінеті табору.
              </p>
            </div>
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={6}
              maxLength={8000}
              placeholder="Напишіть правила, важливу інформацію, розклад або контакти..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{guidelines.length}/8000</p>
              <button
                type="button"
                onClick={handleSaveGuidelines}
                disabled={isSavingGuidelines}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isSavingGuidelines ? 'Збереження...' : guidelinesState === 'done' ? 'Збережено' : 'Зберегти'}
              </button>
            </div>
            {saveGuidelinesError && (
              <p className="text-sm text-red-500">Не вдалося зберегти загальні положення</p>
            )}
          </div>

          {!activeCamp.publicAccessCode ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-sm text-gray-600">
                Ще немає публічного посилання для дітей цього табору.
              </p>
              {error && <p className="text-sm text-red-500">Не вдалося створити посилання</p>}
              <button
                type="button"
                onClick={() => mutate()}
                disabled={isPending}
                className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {isPending ? 'Створення...' : 'Створити посилання'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">URL для дітей</p>
                    <p className="text-sm text-gray-600 mt-1 break-all">{publicUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-semibold"
                  >
                    {copyState === 'done' ? 'Скопійовано' : 'Копіювати'}
                  </button>
                </div>

                {qrCodeUrl && (
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 flex justify-center">
                    <img src={qrCodeUrl} alt="QR code" className="w-64 h-64" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrCodeUrl}
                  className="bg-white rounded-2xl p-4 shadow-sm text-left disabled:opacity-50"
                >
                  <p className="font-semibold text-gray-900">Завантажити QR</p>
                  <p className="text-sm text-gray-500 mt-1">PNG для швидкого поширення</p>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={!qrCodeUrl}
                  className="bg-white rounded-2xl p-4 shadow-sm text-left disabled:opacity-50"
                >
                  <p className="font-semibold text-gray-900">Зберегти як PDF</p>
                  <p className="text-sm text-gray-500 mt-1">Відкриє вікно друку для PDF</p>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
