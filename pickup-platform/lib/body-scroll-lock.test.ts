import { afterEach, describe, expect, it } from 'vitest'
import { lockBodyScroll, resetBodyScrollLockForTests } from './body-scroll-lock'

describe('body-scroll-lock', () => {
  afterEach(() => {
    resetBodyScrollLockForTests()
  })

  it('locks body scroll and restores the previous value', () => {
    document.body.style.overflow = 'auto'
    const unlock = lockBodyScroll()

    expect(document.body.style.overflow).toBe('hidden')

    unlock()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('keeps scroll locked until all nested locks release', () => {
    const first = lockBodyScroll()
    const second = lockBodyScroll()

    first()
    expect(document.body.style.overflow).toBe('hidden')

    second()
    expect(document.body.style.overflow).toBe('')
  })
})
