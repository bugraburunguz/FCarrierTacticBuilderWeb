import { describe, expect, it } from 'vitest'
import type { Preset } from '../api/types'
import { DEFAULT_ANSWERS, profileOf, recommend, scorePreset } from './wizard'

const preset = (id: string, patch: Partial<Preset>): Preset => ({ id, kind: 'STYLE', name: id, formation: '4-3-3', ...patch })

describe('profileOf', () => {
  it('reads build-up and numeric depth from settings', () => {
    const p = profileOf(preset('a', { settings: { buildUp: 'Short (Close Support)', depth: 70 } }))
    expect(p.buildUp).toBe('Short')
    expect(p.depth).toBe(70)
  })

  it('infers depth from the defensive approach text', () => {
    expect(profileOf(preset('a', { settings: { defensiveApproach: 'High / Aggressive' } })).depth).toBe(85)
    expect(profileOf(preset('b', { settings: { defensiveApproach: 'Deep / Low block' } })).depth).toBe(30)
    expect(profileOf(preset('c', { settings: {} })).depth).toBe(50)
  })

  it('detects the striker type from ST slot tags', () => {
    expect(profileOf(preset('a', { slotTags: { ST: ['st_target'] } })).striker).toBe('target')
    expect(profileOf(preset('b', { slotTags: { LST: ['st_run_behind'], RST: ['st_target'] } })).striker).toBe('run')
  })
})

describe('recommend', () => {
  const presets = [
    preset('press', { settings: { buildUp: 'Counter', depth: 85 }, slotTags: { ST: ['st_press'], RW: ['w_cut_inside'] } }),
    preset('possession', { settings: { buildUp: 'Short', depth: 70 }, slotTags: { ST: ['st_drop_deep'], CAM: ['cam_create'] } }),
    preset('block', { settings: { buildUp: 'Counter', depth: 30 }, slotTags: { ST: ['st_target'], RW: ['w_cross'] } }),
  ]

  it('ranks the preset that matches every answer first', () => {
    const answers = { ...DEFAULT_ANSWERS, buildUp: 'Counter' as const, depth: 30, width: 'wings' as const, striker: 'target' as const }
    expect(recommend(presets, answers)[0].preset.id).toBe('block')
  })

  it('prefers possession for short build-up and a high line', () => {
    const answers = { ...DEFAULT_ANSWERS, buildUp: 'Short' as const, depth: 70, width: 'center' as const }
    expect(recommend(presets, answers)[0].preset.id).toBe('possession')
  })

  it('returns reasons for the matched answers and limits the list', () => {
    const answers = { ...DEFAULT_ANSWERS, buildUp: 'Counter' as const, depth: 85 }
    const top = recommend(presets, answers, 2)
    expect(top).toHaveLength(2)
    expect(scorePreset(presets[0], answers).reasons.join(' ')).toContain('kontra')
  })
})
