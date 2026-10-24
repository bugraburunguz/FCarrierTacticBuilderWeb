import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { StarterTactic, UserTactic } from '../api/types'
import { DEFAULT_SETUP, fromStarter, fromUserTactic, mainTacticName, toSaveBody, type TacticState } from './tactic'

/** FAZ 6a-F: göçten gelen "Önceki taslak" ya da boş ad ana taktik adı olarak görünmez. */
describe('mainTacticName', () => {
  it('göç adı ve boş ad "Ana taktik · <formasyon>"; kullanıcının verdiği ad aynen', () => {
    expect(mainTacticName('Önceki taslak', '4-3-3')).toBe('Ana taktik · 4-3-3')
    expect(mainTacticName('  ', '4-4-2')).toBe('Ana taktik · 4-4-2')
    expect(mainTacticName(undefined, '4-4-2')).toBe('Ana taktik · 4-4-2')
    expect(mainTacticName('Gegenpress', '4-3-3')).toBe('Gegenpress')
  })
})
import defaults from './tacticDefaults.json'

const BACKEND_SEED = join(process.cwd(), '..', 'FCarrierTacticBuilderBackend', 'src', 'main', 'resources', 'seed', 'tactic-defaults.json')

/** Sunucunun döndüğü biçimi kurar: kayıt gövdesi (taslak) → user_tactic satırı (V43). */
function stored(body: ReturnType<typeof toSaveBody>, positions: Record<string, string>): UserTactic {
  return {
    slot: 2, careerId: body.careerId, name: body.name, formation: body.tactic.formation ?? '',
    buildUp: body.tactic.setup?.buildUp ?? null, defensiveApproach: null, lineHeight: null,
    slots: body.tactic.slots.map((s) => ({ slot: s.slotId, position: positions[s.slotId], roleId: s.roleId ?? null, tags: s.tags })),
    eaCode: 'EA-1', sourceReplicaId: null, main: false, lineup: body.lineup ?? null,
    depth: body.tactic.setup?.depth ?? null, presetId: body.tactic.presetId ?? null, updatedAt: '2026-10-22T10:00:00Z', lineupDropped: null,
  }
}

describe('tek taktik modeli (KARIYER-UX FAZ 1)', () => {
  it('varsayılan kurulum json kopyasından gelir; kardeş backend seed diskteyse onunla aynı', () => {
    expect(DEFAULT_SETUP).toEqual(defaults.setup)
    if (existsSync(BACKEND_SEED)) {
      expect(JSON.parse(readFileSync(BACKEND_SEED, 'utf8'))).toEqual(defaults)
    }
  })

  it('TacticState → PUT gövdesi → GET → TacticState birebir aynı (diziliş dahil)', () => {
    const tactic: TacticState = {
      formation: '4-4-2', presetId: 'gegenpress', setup: { buildUp: 'Counter', depth: 35 },
      slots: { LCB: { tags: ['cb_step_up'], roleId: 'defender_defend' }, LST: { tags: [] } },
    }
    const lineup = { GK: 11, LCB: 22 }
    const body = toSaveBody(7, 'Kontra', tactic, lineup)
    expect(body.tactic).toEqual({ formation: '4-4-2', presetId: 'gegenpress', setup: { buildUp: 'Counter', depth: 35 },
      slots: [{ slotId: 'LCB', tags: ['cb_step_up'], roleId: 'defender_defend' }, { slotId: 'LST', tags: [], roleId: undefined }] })

    const back = fromUserTactic(stored(body, { LCB: 'CB', LST: 'ST' }))
    expect(back.tactic).toEqual(tactic)
    expect(back.lineup).toEqual(lineup)
  })

  it('kurulumsuz taslak kurulumsuz döner; replika satırındaki boş etiketler korunur', () => {
    const bare: TacticState = { formation: '4-3-3', slots: {} }
    expect(fromUserTactic(stored(toSaveBody(7, 'A', bare, undefined), {})).tactic).toEqual(bare)
    const replica = { ...stored(toSaveBody(7, 'R', bare, undefined), {}), slots: [{ slot: 'ST', position: 'ST', roleId: 'poacher_attack', focus: null, tags: [] }] }
    expect(fromUserTactic(replica).tactic.slots).toEqual({ ST: { tags: [], roleId: 'poacher_attack' } })
  })

  it('başlangıç önerisi taslağa çevrilir (roller ve diziliş)', () => {
    const starter: StarterTactic = {
      formationId: '4-2-3-1', setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 71.2,
      slots: [{ slotId: 'ST', position: 'ST', roleId: 'advanced_forward_attack', roleName: 'Advanced Forward' }],
      lineup: { ST: 9 }, alternatives: [{ formationId: '4-3-3', score: 70 }],
    }
    expect(fromStarter(starter)).toEqual({
      tactic: { formation: '4-2-3-1', setup: { buildUp: 'Balanced', depth: 50 }, slots: { ST: { tags: [], roleId: 'advanced_forward_attack' } } },
      lineup: { ST: 9 },
    })
  })
})
