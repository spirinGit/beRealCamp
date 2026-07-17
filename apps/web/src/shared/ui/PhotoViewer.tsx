import { useEffect, useRef, useState } from 'react'

interface PhotoViewerProps {
  src: string
  alt?: string
  onClose: () => void
}

const DISMISS_THRESHOLD = 120

export function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  const [deltaY, setDeltaY] = useState(0)
  const [snapping, setSnapping] = useState(false)
  const startY = useRef<number | null>(null)
  const isDragging = useRef(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const progress = Math.min(Math.abs(deltaY) / DISMISS_THRESHOLD, 1)

  // Prevent body scroll while viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Use non-passive touch listener to call preventDefault
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (!isDragging.current || startY.current === null) return
      setDeltaY(e.touches[0].clientY - startY.current)
    }

    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [])

  function onDragStart(clientY: number) {
    startY.current = clientY
    isDragging.current = true
    setSnapping(false)
  }

  function onDragEnd() {
    if (!isDragging.current) return
    isDragging.current = false

    if (Math.abs(deltaY) > DISMISS_THRESHOLD) {
      onClose()
    } else {
      setSnapping(true)
      setDeltaY(0)
    }
    startY.current = null
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e.clientY) }}
      onMouseMove={(e) => {
        e.stopPropagation()
        if (!isDragging.current || startY.current === null) return
        setDeltaY(e.clientY - startY.current)
      }}
      onMouseUp={(e) => { e.stopPropagation(); onDragEnd() }}
      onTouchStart={(e) => { e.stopPropagation(); onDragStart(e.touches[0].clientY) }}
      onTouchEnd={(e) => { e.stopPropagation(); onDragEnd() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-w-[90vw] max-h-[90dvh] rounded-2xl object-contain select-none animate-[scaleIn_0.2s_ease]"
        style={{
          transform: `translateY(${deltaY}px)`,
          transition: snapping ? 'transform 0.25s ease' : 'none',
          opacity: 1 - progress * 0.3,
        }}
      />
    </div>
  )
}
