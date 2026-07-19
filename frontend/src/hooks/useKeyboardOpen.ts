import { useEffect, useState } from 'react'

/** True when the on-screen keyboard has shrunk the visual viewport by a meaningful amount —
 * used to hide the bottom tab bar so it doesn't float above the keyboard on mobile. */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const handleResize = () => {
      const shrink = window.innerHeight - vv.height
      setOpen(shrink > 120)
    }

    vv.addEventListener('resize', handleResize)
    handleResize()
    return () => vv.removeEventListener('resize', handleResize)
  }, [])

  return open
}
