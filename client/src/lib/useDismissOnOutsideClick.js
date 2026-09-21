import { useEffect, useRef } from 'react'

/**
 * Close a popover when the user clicks outside it or presses Escape.
 *
 * Shared by the navbar's language panel and the hero's quality selector: both
 * are plain absolutely-positioned panels, so neither gets dismissal from the
 * browser the way a native <select> would.
 *
 * `onDismiss` is held in a ref so callers can pass an inline arrow without
 * re-binding the listeners on every render.
 */
export const useDismissOnOutsideClick = (ref, isOpen, onDismiss) => {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) dismissRef.current?.()
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') dismissRef.current?.()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, isOpen])
}
