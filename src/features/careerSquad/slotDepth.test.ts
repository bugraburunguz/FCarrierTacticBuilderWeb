import { describe, expect, it } from 'vitest'
import type { AcademyPlayer, CareerPlayer } from '../../api/types'
import { buildDepthSlots, SLOT_URGENCY_LABEL, slotDepth, slotForGroup, type DepthSlot } from './slotDepth'

const member = (id: number, positions: string[], overall: number, age: number, extra: Partial<CareerPlayer> = {}): CareerPlayer =>
  ({ player: { id, name: `Oyuncu ${id}`, positions, overall, age }, onLoan: false, ...extra }) as CareerPlayer
const academy = (id: number, position: string, overall: number, age = 17): AcademyPlayer =>
  ({ playerId: id, name: `Altyapı ${id}`, age, positions: [position], overall, youthVerified: false })
const slot = (slotId: string, position: string, playerId?: number, extra: Partial<DepthSlot> = {}): DepthSlot => ({ slotId, position, roleId: 'r', playerId, ...extra })

/** GT-b: "Hangi mevkide yedek sorunum var?" — ana taktiğin 11 slotu × İlk 11 · Yedek · Genç (≤ 21, altyapı dahil); satır başına tek aciliyet metni. */
describe('slot bazlı derinlik matrisi (GT-b)', () => {
  it('satırlar slotlar; ilk 11 slottaki oyuncu, yedek en iyi ilk 11 dışı (> 21 yaş), genç ≤ 21 (kadro ya da altyapı)', () => {
    const squad = [member(1, ['GK'], 75, 28), member(2, ['GK'], 68, 26), member(3, ['GK'], 60, 19)]
    const [gk] = slotDepth([slot('GK', 'GK', 1)], squad, [academy(90, 'GK', 62)])
    expect(gk.starter).toMatchObject({ id: 1, overall: 75, age: 28 })
    expect(gk.backup).toMatchObject({ id: 2, overall: 68 })
    expect(gk.youth).toMatchObject({ id: 90, name: 'Altyapı 90', academy: true })
    expect(gk.urgency).toBeUndefined()
  })

  it('aynı mevkideki iki slot farklı yedek alır; kiralık gönderilen ve başka slotta ilk 11 olan yedek olmaz', () => {
    const squad = [member(1, ['CB'], 75, 27), member(2, ['CB'], 74, 27), member(3, ['CB', 'RB'], 70, 25), member(4, ['CB'], 69, 25), member(5, ['RB'], 72, 26),
      member(6, ['CB'], 80, 24, { loanedOut: true })]
    const rows = slotDepth([slot('LCB', 'CB', 1), slot('RCB', 'CB', 2), slot('RB', 'RB', 5)], squad, [])
    expect(rows.map((r) => r.backup?.id)).toEqual([3, 4, 3])
  })

  it('aciliyet tek metin ve öncelik sırası: Yedek yok > Yalnız genç yedek > İlk 11 ≥ 30 yaş > İlk 11 kalite açığı', () => {
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31)], [])[0].urgency).toBe('NO_BACKUP')
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31), member(2, ['ST'], 60, 20)], [])[0].urgency).toBe('YOUTH_ONLY')
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31)], [academy(90, 'ST', 55)])[0].urgency).toBe('YOUTH_ONLY')
    const backed = [member(1, ['ST'], 70, 31), member(2, ['ST'], 65, 25)]
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'KALITE_ACIGI' })], backed, [])[0].urgency).toBe('OLD_STARTER')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'KALITE_ACIGI' })], [member(1, ['ST'], 70, 26), member(2, ['ST'], 65, 25)], [])[0].urgency).toBe('QUALITY_GAP')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'IKISI' })], [member(1, ['ST'], 70, 26), member(2, ['ST'], 65, 25)], [])[0].urgency).toBe('QUALITY_GAP')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'UYGUN' })], [member(1, ['ST'], 70, 26), member(2, ['ST'], 65, 25)], [])[0].urgency).toBeUndefined()
    expect(Object.values(SLOT_URGENCY_LABEL)).toEqual(['Yedek yok', 'Yalnız genç yedek', 'İlk 11 ≥ 30 yaş', 'İlk 11 kalite açığı'])
  })

  it('altyapıda o mevkide oyuncu varsa satırda adı (en yüksek OVR)', () => {
    const [row] = slotDepth([slot('LM', 'LM', 1)], [member(1, ['LM'], 70, 26)], [academy(90, 'LM', 55), academy(91, 'LM', 58), academy(92, 'ST', 70)])
    expect(row.academyName).toBe('Altyapı 91')
  })

  it('genç de slotlar arasında paylaşılmaz: iki ST slotu, tek genç forvet → ikinci satır "Yedek yok"', () => {
    const rows = slotDepth([slot('LST', 'ST', 1), slot('RST', 'ST', 2)], [member(1, ['ST'], 70, 26), member(2, ['ST'], 69, 26), member(3, ['ST'], 60, 19)], [])
    expect(rows.map((r) => r.urgency)).toEqual(['YOUTH_ONLY', 'NO_BACKUP'])
    expect(rows[1].youth).toBeUndefined()
  })

  it('OVR bilinmeyen altyapı oyuncusu 0 değil, bilinmiyor', () => {
    const [row] = slotDepth([slot('GK', 'GK', 1)], [member(1, ['GK'], 70, 26)], [{ ...academy(90, 'GK', 0), overall: null }])
    expect(row.youth?.overall).toBeUndefined()
  })

  it('satırlar her zaman formasyonun 11 slotundan: dizilmemiş (satılmış) slot da satır; rol taktikten, kalite sınıfı uyum satırından', () => {
    const formation = { slots: [{ slotId: 'GK', position: 'GK', defaultRole: 'gk_default' }, { slotId: 'ST', position: 'ST', defaultRole: 'st_default' }] }
    const slots = buildDepthSlots(formation, { GK: 1 }, { GK: { roleId: 'goalkeeper_defend' }, ST: { roleId: 'poacher_attack' } },
      [{ slotId: 'GK', roleId: 'goalkeeper_defend', weakClass: 'KALITE_ACIGI' }])
    expect(slots).toEqual([
      { slotId: 'GK', position: 'GK', roleId: 'goalkeeper_defend', playerId: 1, weakClass: 'KALITE_ACIGI' },
      { slotId: 'ST', position: 'ST', roleId: 'poacher_attack', playerId: undefined, weakClass: undefined },
    ])
    expect(buildDepthSlots(undefined, { GK: 1 }, {}, [])).toEqual([])
  })

  it('eski ?grup= değerleri ilgili ilk slot satırına: MID → CM, W → kanat, FB → bek', () => {
    const slots = [slot('GK', 'GK'), slot('LB', 'LB'), slot('LCB', 'CB'), slot('LCM', 'CM'), slot('LM', 'LM'), slot('ST', 'ST')]
    expect(slotForGroup(slots, 'MID')).toBe('LCM')
    expect(slotForGroup(slots, 'W')).toBe('LM')
    expect(slotForGroup(slots, 'FB')).toBe('LB')
    expect(slotForGroup(slots, 'GK')).toBe('GK')
    expect(slotForGroup(slots, undefined)).toBeUndefined()
  })
})
