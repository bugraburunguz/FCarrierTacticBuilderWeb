import { beforeEach, describe, expect, it } from 'vitest'
import { resolveUiVersion } from './uiVersion'

/** PROD-PREP 1: prod build'de yalnız v3 (?ui=v2 kapalı, build bayrağı VITE_UI_V2); geliştirmede geçiş kalır. */
describe('resolveUiVersion', () => {
  beforeEach(() => sessionStorage.clear())

  it('v2 geçişi kapalıyken (prod): her zaman v3, ?ui=v2 yok sayılır ve oturuma yazılmaz', () => {
    expect(resolveUiVersion('', false)).toBe('v3')
    expect(resolveUiVersion('?ui=v2', false)).toBe('v3')
    expect(sessionStorage.getItem('fc.ui')).toBeNull()
  })

  it('v2 geçişi açıkken (geliştirme): ?ui=v3 oturuma yazılır, ?ui=v2 kapatır', () => {
    expect(resolveUiVersion('?ui=v3', true)).toBe('v3')
    expect(resolveUiVersion('', true)).toBe('v3')
    expect(resolveUiVersion('?ui=v2', true)).toBe('v2')
    expect(resolveUiVersion('', true)).toBe('v2')
  })
})
