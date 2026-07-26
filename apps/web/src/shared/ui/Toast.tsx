import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-6 left-6 right-6 z-50 transition-all duration-300 ${
        isLeaving ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div
        className={`rounded-2xl px-6 py-4 text-white font-semibold text-center ${
          type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        {type === 'success' ? '✅ ' : '❌ '}{message}
      </div>
    </div>
  )
}
