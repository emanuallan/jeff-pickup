let lockCount = 0
let savedOverflow = ''

/** Prevent background scroll while overlays are open. Supports nested locks. */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {}
  }

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  lockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow
    }
  }
}

/** Test helper — resets module state between cases. */
export function resetBodyScrollLockForTests() {
  lockCount = 0
  savedOverflow = ''
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
}
