import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

/** GUV-2: Lab'da her atama ayrı /fit/lineup isteğiydi; analiz kovası 60/dk. İlk değer bekletilmez, art arda değişikliklerden yalnız sonuncusu geçer. */
describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ilk değer hemen döner; art arda değişikliklerden yalnız sonuncusu süre dolunca geçer', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } })
    expect(result.current).toBe('a')

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'c' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('c')
  })
})
