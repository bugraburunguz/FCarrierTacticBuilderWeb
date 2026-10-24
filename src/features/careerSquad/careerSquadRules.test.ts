import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../../api/types'
import { depthRows, positionCapacity } from '../../lib/deskRules'
import { ageBands, contractTimeline, groupRoster, legacySquadTarget, squadStats } from './careerSquadRules'

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

describe('derinlik: mevki grubunda kim var, kaç kişi', () => {
  it('grup başına eldeki/gereken ve oyuncular reytinge göre; kiralık gönderilen sayılmaz', () => {
    const roster = groupRoster([member(1, 'GK', 70, 30), member(2, 'GK', 64, 22), member(3, 'CM', 75, 26), member(4, 'CM', 60, 19, { loanedOut: true, onLoan: true })])
    const gk = roster.find((g) => g.group === 'GK')!
    expect(gk).toMatchObject({ label: 'Kaleci', have: 2, need: 2, short: 0 })
    expect(gk.players.map((p) => p.id)).toEqual([1, 2])
    const mid = roster.find((g) => g.group === 'MID')!
    expect(mid).toMatchObject({ have: 1, need: 4, short: 3 })
    expect(mid.players.map((p) => p.id)).toEqual([3])
  })
})

/** KARIYER-UX 6: derinlik matrisi — grup başına ilk 11 / yedek / genç (≤21, ilk 11 dışı) ve aciliyet. */
describe('derinlik matrisi', () => {
  it('oyuncular ilk 11 (ana taktik), yedek ve genç olarak ayrılır; aciliyet: eksik > yedek yok > yalnız genç yedek > yeterli', () => {
    const squad = [
      member(1, 'GK', 70, 30), member(2, 'GK', 60, 19),
      member(3, 'CB', 75, 27), member(4, 'CB', 74, 25), member(5, 'CB', 65, 28),
      member(6, 'ST', 72, 26), member(7, 'ST', 70, 24),
    ]
    const rows = groupRoster(squad, new Map([[1, 'GK'], [3, 'CB'], [4, 'CB'], [6, 'ST'], [7, 'ST']]))
    const gk = rows.find((r) => r.group === 'GK')!
    expect(gk.players.map((p) => [p.id, p.tier])).toEqual([[1, 'starter'], [2, 'youth']])
    expect(gk.urgency).toBe('youth-only')
    expect(rows.find((r) => r.group === 'CB')!.urgency).toBe('ok')
    expect(rows.find((r) => r.group === 'ST')!.urgency).toBe('no-backup')
    expect(rows.find((r) => r.group === 'MID')!.urgency).toBe('short')
  })

  it('ilk 11 bilinmiyorsa herkes yedek/genç sayılır, aciliyet yalnız eksik/yeterli', () => {
    const rows = groupRoster([member(1, 'GK', 70, 30), member(2, 'GK', 60, 30)])
    expect(rows.find((r) => r.group === 'GK')!.players.map((p) => p.tier)).toEqual(['backup', 'backup'])
    expect(rows.find((r) => r.group === 'GK')!.urgency).toBe('ok')
  })
})

/**
 * FAZ 6a-B: tek derinlik tanımı. İlk 11 = ana taktikte o slotu oynayan (slot mevkisinin grubunda); kapasite = listelenen mevkilerin hepsi,
 * ana mevki birincil, diğerleri ikincil. Canlıdaki iki çelişki: Forvet "İlk 11: Yok" (ST'de oynayan RW birincilli oyuncu) ve RW "0 · Oyuncu yok".
 */
describe('FAZ 6a-B tek derinlik tanımı', () => {
  const onel = member(10, 'RW', 70, 31, {}, { name: 'Onel Hernández', positions: ['RW', 'ST'] })
  const ouazane = member(11, 'RM', 66, 24, {}, { name: 'Ouazane', positions: ['RM', 'RB', 'RW'] })
  const gutierrez = member(12, 'RB', 64, 27, {}, { name: 'Gutiérrez', positions: ['RB'] })
  const striker = member(13, 'ST', 60, 29)

  it('ST slotunda oynayan oyuncu Forvet grubunda İlk 11 (birincil mevkisi kanat olsa da)', () => {
    const rows = groupRoster([onel, ouazane, gutierrez, striker], new Map([[10, 'ST'], [11, 'RW'], [12, 'RB']]))
    const st = rows.find((r) => r.group === 'ST')!
    expect(st.players.filter((p) => p.tier === 'starter').map((p) => p.name)).toEqual(['Onel Hernández'])
    expect(st.players.find((p) => p.id === 13)).toMatchObject({ tier: 'backup', primary: true })
    // Başka grupta ilk 11 olan oyuncu bu grupta yedek sayılmaz (aciliyet onu yedek diye saymaz), "ilk 11: <mevki>" notuyla görünür.
    const wing = rows.find((r) => r.group === 'W')!
    expect(wing.players.find((p) => p.id === 10)).toMatchObject({ startsAt: 'ST' })
    expect(wing.players.filter((p) => p.tier === 'starter').map((p) => p.id)).toEqual([11])
  })

  it('kapasite listelenen tüm mevkileri sayar; birincil/ikincil ayrılır; Masa derinliği aynı sayıyı kullanır', () => {
    const capacity = positionCapacity([onel, ouazane, gutierrez, striker])
    expect(capacity.get('RW')).toMatchObject({ primary: [onel], secondary: [ouazane] })
    expect(capacity.get('RB')!.primary.map((c) => c.player.id)).toEqual([12])
    expect(capacity.get('RB')!.secondary.map((c) => c.player.id)).toEqual([11])
    const fb = depthRows([onel, ouazane, gutierrez, striker]).find((d) => d.group === 'FB')!
    expect(fb.have).toBe(2)
    const fbRoster = groupRoster([onel, ouazane, gutierrez, striker]).find((r) => r.group === 'FB')!
    expect(fbRoster.have).toBe(fb.have)
    expect(fbRoster.players.find((p) => p.id === 11)).toMatchObject({ primary: false })
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
