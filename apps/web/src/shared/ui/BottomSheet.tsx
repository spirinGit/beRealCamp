import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SWIPE_THRESHOLD = 80

interface BottomSheetProps {
  onClose: () => void
  children: React.ReactNode
  className?: string
  zIndex?: string
}

export function BottomSheet({ onClose, children, className = '', zIndex = 'z-20' }: BottomSheetProps) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const dismissed = useRef(false)

  // Open animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Non-passive touchmove to allow e.preventDefault() when dragging down
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    function onMove(e: TouchEvent) {
      if (!draggingRef.current || startYRef.current === null) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta > 0) {
        e.preventDefault()
        setDragY(delta)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  function dismiss() {
    if (dismissed.current) return
    dismissed.current = true
    setClosing(true)
    setDragY(0)
    // setTimeout guarantees onClose is always called — no relying on transitionend
    setTimeout(onClose, 300)
  }

  function isScrolledDown(target: HTMLElement): boolean {
    let el: HTMLElement | null = target
    while (el && el !== panelRef.current) {
      const { overflowY } = window.getComputedStyle(el)
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) return true
      el = el.parentElement
    }
    return false
  }

  function onTouchStart(e: React.TouchEvent) {
    if (isScrolledDown(e.target as HTMLElement)) return
    startYRef.current = e.touches[0].clientY
    draggingRef.current = true
    setDragging(true)
  }

  function onTouchEnd() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (dragY >= SWIPE_THRESHOLD) {
      dismiss()
    } else {
      setDragY(0)
    }
    startYRef.current = null
  }

  const panelTransform = closing
    ? 'translateY(100%)'
    : open
      ? `translateY(${dragY}px)`
      : 'translateY(100%)'
  const timing = dragging ? 'none' : '0.3s ease-out'

  return createPortal(
    <div className={`fixed inset-0 ${zIndex} flex flex-col justify-end pointer-events-none`}>
      <div
        ref={panelRef}
        className={`relative bg-white rounded-t-3xl pointer-events-auto ${className}`}
        style={{ transform: panelTransform, transition: `transform ${timing}` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
