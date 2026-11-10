import { describe, expect, it } from 'vitest'
import type { AcademyPlayer, CareerPlayer, DepthEntry } from '../api/types'
import { slotForGroup } from '../features/careerSquad/careerSquadRules'
import { buildDepthSlots, SLOT_URGENCY_LABEL, slotDepth, urgencyLabel, type DepthSlot } from './slotDepth'

const member = (id: number, positions: string[], overall: number, age: number, extra: Partial<CareerPlayer> = {}): CareerPlayer =>
  ({ player: { id, name: `Oyuncu ${id}`, positions, overall, age }, onLoan: false, ...extra }) as CareerPlayer
const academy = (id: number, position: string, overall: number, age = 17): AcademyPlayer =>
  ({ playerId: id, name: `Altyapı ${id}`, age, positions: [position], overall, youthVerified: false })
/** /fit/lineup slot.depth girdisi (FCA-15 backend #48): sunucu tekil atar, web yalnız okur. */
const d = (playerId: number, extra: Partial<DepthEntry> = {}): DepthEntry =>
  ({ playerId, playerName: `Oyuncu ${playerId}`, combined: 70, roleFitScore: 70, badge: 'GREEN', currentFit: 70, weak: false, ...extra }) as DepthEntry
const slot = (slotId: string, position: string, playerId?: number, extra: Partial<DepthSlot> = {}): DepthSlot =>
  ({ slotId, position, roleId: 'r', playerId, depth: [], ...extra })

/** GT-b + FCA-15: ana taktiğin 11 slotu × İlk 11 · Yedek (sunucunun depth[0]'ı) · Genç (≤ 21, altyapı dahil, web); satır başına tek aciliyet. */
describe('slot bazlı derinlik matrisi (GT-b, FCA-15)', () => {
  it('yedek /fit/lineup depth[0]; OVR ve yaş kadrodan; genç ≤ 21 (kadro ya da altyapı)', () => {
    const squad = [member(1, ['GK'], 75, 28), member(2, ['GK'], 68, 26), member(3, ['GK'], 60, 19)]
    const [gk] = slotDepth([slot('GK', 'GK', 1, { depth: [d(2)] })], squad, [academy(90, 'GK', 62)])
    expect(gk.starter).toMatchObject({ id: 1, overall: 75, age: 28 })
    expect(gk.backup).toMatchObject({ id: 2, name: 'Oyuncu 2', overall: 68, age: 26 })
    expect(gk.youth).toMatchObject({ id: 90, name: 'Altyapı 90', academy: true })
    expect(gk.urgency).toBeUndefined()
  })

  it('kadroda OVR + mevki eşleşmesiyle seçim yok: sunucu depth vermediyse kadroda CB olsa da yedek yok', () => {
    const squad = [member(1, ['CB'], 75, 27), member(4, ['CB'], 69, 25)]
    const [row] = slotDepth([slot('LCB', 'CB', 1)], squad, [])
    expect(row.backup).toBeUndefined()
    expect(row.urgency).toBe('NO_BACKUP')
  })

  it('kabul: CM/CDM/CAM listeleyen tek yedek yalnız bir satırda (sunucu tekil verdiyse); "N slotta yedek" sayısı yok', () => {
    const squad = [member(1, ['CDM'], 75, 27), member(2, ['CM'], 74, 27), member(3, ['CAM'], 73, 27), member(9, ['CM', 'CDM', 'CAM'], 70, 26)]
    const rows = slotDepth([slot('CDM', 'CDM', 1), slot('CM', 'CM', 2, { depth: [d(9)] }), slot('CAM', 'CAM', 3)], squad, [])
    expect(rows.filter((r) => r.backup?.id === 9).map((r) => r.slotId)).toEqual(['CM'])
    expect(rows.map((r) => 'backupSlots' in r)).toEqual([false, false, false])
  })

  it('savunma: sunucu aynı oyuncuyu iki slota verse de web tek satırda gösterir; sonraki girdi (depth[1]) kullanılır', () => {
    const squad = [member(1, ['CB'], 75, 27), member(2, ['CB'], 74, 27), member(3, ['CB'], 70, 25), member(4, ['CB'], 69, 25)]
    const rows = slotDepth([slot('LCB', 'CB', 1, { depth: [d(3)] }), slot('RCB', 'CB', 2, { depth: [d(3), d(4)] })], squad, [])
    expect(rows.map((r) => r.backup?.id)).toEqual([3, 4])
  })

  it('kabul: RB-only yedek LB satırında yedek (sunucu öyle döndürdüyse; mevki adı birebir eşleşmesi gerekmez)', () => {
    const squad = [member(1, ['LB'], 75, 27), member(5, ['RB'], 72, 26)]
    const [lb] = slotDepth([slot('LB', 'LB', 1, { depth: [d(5)] })], squad, [])
    expect(lb.backup?.id).toBe(5)
    expect(lb.urgency).toBeUndefined()
  })

  it('kabul: yedek var ama weak → "Yedek zayıf (Güç 41)"', () => {
    const squad = [member(1, ['ST'], 75, 26), member(2, ['CB'], 60, 27)]
    const [st] = slotDepth([slot('ST', 'ST', 1, { depth: [d(2, { weak: true, currentFit: 41.4, fitLabel: 'WRONG_ROLE' })] })], squad, [])
    expect(st.backup).toMatchObject({ id: 2, weak: true, currentFit: 41.4 })
    expect(st.urgency).toBe('WEAK_BACKUP')
    expect(urgencyLabel(st)).toBe('Yedek zayıf (Güç 41)')
  })

  it('kabul: kadroda ilk 11 dışı uygun oyuncu varken (sunucu depth verdi) "Yedek yok" çıkmaz', () => {
    const squad = [member(1, ['CB'], 75, 27), member(2, ['CB'], 74, 27), member(3, ['CB'], 70, 25), member(4, ['RB', 'CB'], 66, 28)]
    const rows = slotDepth([slot('LCB', 'CB', 1, { depth: [d(3)] }), slot('CCB', 'CB', 2, { depth: [d(4)] }), slot('RCB', 'CB', 5, { depth: [] })],
      [...squad, member(5, ['CB'], 72, 27)], [])
    expect(rows.slice(0, 2).map((r) => r.urgency)).toEqual([undefined, undefined])
  })

  it('kiralık gönderilen, kadroda olmayan ya da ilk 11\'deki depth girdisi yedek olmaz', () => {
    const squad = [member(1, ['ST'], 75, 26), member(2, ['ST'], 74, 26), member(3, ['ST'], 70, 25, { loanedOut: true })]
    const [row] = slotDepth([slot('LST', 'ST', 1, { depth: [d(3), d(99), d(2)] }), slot('RST', 'ST', 2)], squad, [])
    expect(row.backup).toBeUndefined()
  })

  it('aciliyet sırası: Yedek yok > Yalnız genç yedek > Yedek zayıf > İlk 11 ≥ 30 yaş > İlk 11 kalite açığı', () => {
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31)], [])[0].urgency).toBe('NO_BACKUP')
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31), member(2, ['ST'], 60, 20)], [])[0].urgency).toBe('YOUTH_ONLY')
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 31)], [academy(90, 'ST', 55)])[0].urgency).toBe('YOUTH_ONLY')
    const backed = [member(1, ['ST'], 70, 31), member(2, ['ST'], 65, 25)]
    expect(slotDepth([slot('ST', 'ST', 1, { depth: [d(2, { weak: true })] })], backed, [])[0].urgency).toBe('WEAK_BACKUP')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'KALITE_ACIGI', depth: [d(2)] })], backed, [])[0].urgency).toBe('OLD_STARTER')
    const young = [member(1, ['ST'], 70, 26), member(2, ['ST'], 65, 25)]
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'KALITE_ACIGI', depth: [d(2)] })], young, [])[0].urgency).toBe('QUALITY_GAP')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'IKISI', depth: [d(2)] })], young, [])[0].urgency).toBe('QUALITY_GAP')
    expect(slotDepth([slot('ST', 'ST', 1, { weakClass: 'UYGUN', depth: [d(2)] })], young, [])[0].urgency).toBeUndefined()
    expect(Object.values(SLOT_URGENCY_LABEL)).toEqual(['Yedek yok', 'Yalnız genç yedek', 'Yedek zayıf', 'İlk 11 ≥ 30 yaş', 'İlk 11 kalite açığı'])
  })

  it('eski backend (depth alanı yok): yedek "bilinmiyor", yedek aciliyeti üretilmez; yaş ve kalite aciliyeti kalır', () => {
    const [row] = slotDepth([slot('ST', 'ST', 1, { depth: undefined })], [member(1, ['ST'], 70, 26), member(2, ['ST'], 65, 25)], [])
    expect(row.depthKnown).toBe(false)
    expect(row.backup).toBeUndefined()
    expect(row.urgency).toBeUndefined()
    const [old] = slotDepth([slot('ST', 'ST', 1, { depth: undefined })], [member(1, ['ST'], 70, 32)], [])
    expect(old.urgency).toBe('OLD_STARTER')
    expect(slotDepth([slot('ST', 'ST', 1)], [member(1, ['ST'], 70, 26)], [])[0].depthKnown).toBe(true)
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

  it('kabul: genç tek satırda, en uygun mevkide (ilk mevkisi); farklı mevkili slotlar aynı genci paylaşmaz', () => {
    const squad = [member(1, ['CB'], 75, 27), member(2, ['RB'], 74, 27), member(3, ['LB'], 73, 27), member(7, ['RB', 'CB', 'LB'], 60, 19)]
    const rows = slotDepth([slot('LB', 'LB', 3), slot('CB', 'CB', 1), slot('RB', 'RB', 2)], squad, [])
    expect(rows.filter((r) => r.youth?.id === 7).map((r) => r.slotId)).toEqual(['RB'])
    expect(rows.map((r) => r.urgency)).toEqual(['NO_BACKUP', 'NO_BACKUP', 'YOUTH_ONLY'])
  })

  it('OVR bilinmeyen altyapı oyuncusu 0 değil, bilinmiyor', () => {
    const [row] = slotDepth([slot('GK', 'GK', 1)], [member(1, ['GK'], 70, 26)], [{ ...academy(90, 'GK', 0), overall: null }])
    expect(row.youth?.overall).toBeUndefined()
  })

  it('satırlar her zaman formasyonun 11 slotundan: dizilmemiş (satılmış) slot da satır; rol taktikten, kalite sınıfı ve depth uyum satırından', () => {
    const formation = { slots: [{ slotId: 'GK', position: 'GK', defaultRole: 'gk_default' }, { slotId: 'ST', position: 'ST', defaultRole: 'st_default' }] }
    const slots = buildDepthSlots(formation, { GK: 1 }, { GK: { roleId: 'goalkeeper_defend' }, ST: { roleId: 'poacher_attack' } },
      [{ slotId: 'GK', roleId: 'goalkeeper_defend', weakClass: 'KALITE_ACIGI', depth: [d(2)] }])
    expect(slots).toEqual([
      { slotId: 'GK', position: 'GK', roleId: 'goalkeeper_defend', playerId: 1, weakClass: 'KALITE_ACIGI', depth: [d(2)] },
      { slotId: 'ST', position: 'ST', roleId: 'poacher_attack', playerId: undefined, weakClass: undefined, depth: undefined },
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
