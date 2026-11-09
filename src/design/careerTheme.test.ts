/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { modeStore } from '../state/modeStore'
import { themeStore } from '../state/themeStore'
import { syncDesign } from './boot'

/*
 * FCA-3 Parça 1: kariyer modu Stitch "Tactical Operations" görünümü. Düz (cam ve aurora yok), opak yüzeyler, zümrüt vurgu,
 * 4–8 px köşe. Kariyer şimdilik yalnız koyu tema; UT kendi temasında kalır.
 */
const css = readFileSync('src/design/tokens.css', 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `${selector} bloğu`).toBeGreaterThanOrEqual(0)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

describe('kariyer token seti (Stitch)', () => {
  const career = block(':root[data-ui="v3"][data-mode="career"]')

  it('zemin, panel ve vurgu Stitch değerleri; yüzeyler opak, aurora kapalı', () => {
    expect(career['--bg-base']).toBe('#0b0f15')
    expect(career['--glass-1']).toBe('#111823')
    expect(career['--glass-2']).toBe('#182232')
    expect(career['--glass-border']).toBe('#223249')
    expect(career['--accent']).toBe('#10b981')
    expect(career['--aurora-opacity']).toBe('0')
    expect(career['--glass-blur-1']).toBe('0px')
    expect(career['--glass-shadow']).toBe('none')
  })

  it('köşeler 4–8 px (rozet/düğme 4, panel 8)', () => {
    expect(career['--radius-sm']).toBe('4px')
    expect(career['--radius-lg']).toBe('8px')
    expect(career['--radius-xl']).toBe('8px')
  })

  it('saha koyu çim yeşili, ince beyaz çizgi', () => {
    expect(career['--cyber-pitch-1']).toBe('#186338')
    expect(career['--pitch-1']).toBe('#186338')
  })
})

describe('kariyer yalnız koyu tema', () => {
  afterEach(() => {
    themeStore.set('dark')
    modeStore.set('career')
  })

  it('açık tema seçiliyken kariyere geçilince kök koyu çizilir; UT\'ye dönünce açık tema geri gelir', () => {
    document.documentElement.dataset.ui = 'v3'
    themeStore.set('light')
    modeStore.set('career')
    syncDesign()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    modeStore.set('ut')
    syncDesign()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
