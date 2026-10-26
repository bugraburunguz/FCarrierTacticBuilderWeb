import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../../api/types'
import { depthRows, positionCapacity } from '../../lib/deskRules'
import { ageBands, contractTimeline, legacySquadTarget, squadStats } from './careerSquadRules'

const member = (id: number, position: string, overall: number, age: number, extra: Partial<CareerPlayer> = {}, player: object = {}): CareerPlayer =>
  ({ player: { id, name: `Oyuncu ${id}`, positions: [position], overall, age, ...player }, onLoan: false, ...extra }) as CareerPlayer

describe('Kadro özeti (diziliş sekmesi StatTile\'ları)', () => {
  it('ortalama reyting ve yaş kadrodan (kiralık gönderilen hariç), oyuncu sayısı ve kiralıktaki sayısı', () => {
    const stats = squadStats([member(1, 'GK', 70, 30), member(2, 'CB', 80, 20), member(3, 'ST', 60, 25, { loanedOut: true, onLoan: true })])
    expect(stats).toEqual({ avgOverall: 75, avgAge: 25, count: 3, loanedOut: 1 })
  })

  it('boş kadroda değer yok (0 uydurulmaz)', () => {
    expect(squadStats([])).toEqual({ avgOverall: undefined, avgAge: undefined, count: 0, loanedOut: 0 })
  })
})

/**
 * FAZ 6a-B: Masa derinliği kapasitesi — listelenen mevkilerin hepsi, ana mevki birincil, diğerleri ikincil. (Derinlik ekranı GT-b'de slot bazlı:
 * slotDepth.test.ts.)
 */
describe('FAZ 6a-B tek derinlik tanımı', () => {
  const onel = member(10, 'RW', 70, 31, {}, { name: 'Onel Hernández', positions: ['RW', 'ST'] })
  const ouazane = member(11, 'RM', 66, 24, {}, { name: 'Ouazane', positions: ['RM', 'RB', 'RW'] })
  const gutierrez = member(12, 'RB', 64, 27, {}, { name: 'Gutiérrez', positions: ['RB'] })
  const striker = member(13, 'ST', 60, 29)

  it('kapasite listelenen tüm mevkileri sayar; birincil/ikincil ayrılır; Masa derinliği aynı sayıyı kullanır', () => {
    const capacity = positionCapacity([onel, ouazane, gutierrez, striker])
    expect(capacity.get('RW')).toMatchObject({ primary: [onel], secondary: [ouazane] })
    expect(capacity.get('RB')!.primary.map((c) => c.player.id)).toEqual([12])
    expect(capacity.get('RB')!.secondary.map((c) => c.player.id)).toEqual([11])
    // Grup eşiği ağırlıklı: birincil + ⌊ikincil/2⌋ (ikincil oyuncu iki grubu birden tam doldurmaz); ayrım ayrıca verilir.
    const fb = depthRows([onel, ouazane, gutierrez, striker]).find((d) => d.group === 'FB')!
    expect(fb).toMatchObject({ have: 1, primary: 1, secondary: 1 })
  })
})

/** 6a açık soru 1 (Buğra kararı): ikincil mevki grup eşiğinde yarım sayılır; iki CB ikincili iki CDM'yi "yeterli" yapmaz. */
describe('grup derinliği ağırlıklı', () => {
  it('2 birincil + 3 ikincil = 3; eksik buna göre', () => {
    const squad = [
      member(1, 'CB', 70, 25), member(2, 'CB', 70, 25),
      member(3, 'CDM', 70, 25, {}, { positions: ['CDM', 'CB'] }), member(4, 'CDM', 70, 25, {}, { positions: ['CDM', 'CB'] }),
      member(5, 'RB', 70, 25, {}, { positions: ['RB', 'CB'] }),
    ]
    const cb = depthRows(squad).find((d) => d.group === 'CB')!
    expect(cb).toMatchObject({ primary: 2, secondary: 3, have: 3, need: 3, short: 0 })
    expect(depthRows(squad.slice(0, 4)).find((d) => d.group === 'CB')).toMatchObject({ have: 3, short: 0 })
    expect(depthRows([member(1, 'CB', 70, 25), member(3, 'CDM', 70, 25, {}, { positions: ['CDM', 'CB'] })]).find((d) => d.group === 'CB')).toMatchObject({ have: 1, short: 2 })
  })
})

/** KARIYER-UX 6: yaş bantları (gençleştirme stratejisi için): genç ≤21, prime 22–29, tecrübeli 30+; kiralık gönderilen hariç. */
describe('yaş bantları', () => {
  it('bant sayıları ve oranları; yaşı bilinmeyen sayılmaz', () => {
    const bands = ageBands([member(1, 'GK', 70, 19), member(2, 'CB', 70, 21), member(3, 'CB', 70, 25), member(4, 'ST', 70, 31),
      member(5, 'ST', 70, 33, { loanedOut: true }), member(6, 'ST', 70, 0, {}, { age: undefined })])
    expect(bands.map((b) => [b.key, b.count, b.share])).toEqual([['young', 2, 0.5], ['prime', 1, 0.25], ['veteran', 1, 0.25]])
  })
})

describe('sözleşme bitiş zaman çizgisi', () => {
  it('bitiş yılına göre gruplar, tarihe göre sıralı; ≤ 6 ay olanlar işaretli; tarihi olmayan ve kiralık gönderilen girmez', () => {
    const squad = [
      member(1, 'GK', 70, 30, {}, { contractUntil: '2028-06-30' }),
      member(2, 'CB', 70, 30, {}, { contractUntil: '2027-05-01' }),
      member(3, 'ST', 70, 30, {}, { contractUntil: '2027-06-30' }),
      member(4, 'ST', 70, 30),
      member(5, 'ST', 70, 30, { loanedOut: true, onLoan: true }, { contractUntil: '2027-02-01' }),
    ]
    const lanes = contractTimeline(squad, '2027-01-15')
    expect(lanes.map((l) => [l.year, l.players.map((p) => [p.id, p.months, p.soon])])).toEqual([
      ['2027', [[2, 3, true], [3, 5, true]]],
      ['2028', [[1, 17, false]]],
    ])
  })

  it('oyun tarihi yoksa ay ve "yakında" hesaplanmaz', () => {
    const [lane] = contractTimeline([member(2, 'CB', 70, 30, {}, { contractUntil: '2027-05-01' })], undefined)
    expect(lane.players[0]).toMatchObject({ months: undefined, soon: false })
  })
})

describe('eski /squad adresi (15 §3)', () => {
  it.each([
    ['', '/career/squad'],
    ['?sekme=saha', '/career/squad'],
    ['?sekme=oyuncular', '/career/squad?sekme=liste'],
    ['?sekme=hareketler', '/career/squad?sekme=hareketler'],
    ['?sekme=kariyer', '/career/dashboard?sekme=ayarlar'],
    ['?sekme=oyuncular&x=1', '/career/squad?sekme=liste&x=1'],
  ])('/squad%s → %s', (search, target) => {
    expect(legacySquadTarget(search)).toBe(target)
  })
})
