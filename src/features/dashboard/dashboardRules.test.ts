import { describe, expect, it } from 'vitest'
import type { Career, CareerPlayer, CareerSnapshot, RoleFit } from '../../api/types'
import { fitDisplay } from '../../lib/fitLabels'
import type { SlotFitRow } from '../squad/useSlotFits'
import { financeSummary, reasonText, recordGaps, snapshotTimeline, upcomingEvents, urgentAlerts, weakLinks, withContracts } from './dashboardRules'

const row = (slotId: string, fitLabel: RoleFit['fitLabel'], levelFit: number, reasons: string[] = []): SlotFitRow => {
  const fit = { playerId: 1, playerName: 'X', roleId: 'r', roleName: 'Rol', score: 70, levelFit, fitLabel, reasons, projectedRating: 70, outOfPosition: false, weaponChecks: [] } as unknown as RoleFit
  return { slotId, position: 'CM', roleId: 'r', roleName: 'Rol', playerId: Number(slotId.replace(/\D/g, '')) || 1, playerName: `Oyuncu ${slotId}`, fit, display: fitDisplay(fit) }
}

const member = (id: number, extra: Partial<CareerPlayer> = {}, player: object = {}): CareerPlayer =>
  ({ player: { id, name: `Oyuncu ${id}`, positions: ['CM'], overall: 70, ...player }, onLoan: false, ...extra }) as CareerPlayer

/** FAZ 6a-A: Masa'da tek "Kayıt verisi eksik" bandı: ne eksik, neyi etkiliyor. */
describe('kayıt verisi eksikleri', () => {
  it('oyun tarihi, maaş/sözleşme, kiralık bitişi ayrı ayrı; facets yüklenmemişse yalnız oyun tarihi değerlendirilir; tam veride boş', () => {
    expect(recordGaps(undefined, { contractData: false, loanData: false }).map((g) => g.key)).toEqual(['gameDate', 'contracts', 'loans'])
    expect(recordGaps(undefined, undefined).map((g) => g.key)).toEqual(['gameDate'])
    expect(recordGaps('2027-01-15', { contractData: true, loanData: true })).toEqual([])
    expect(recordGaps(undefined, { contractData: true, loanData: true })[0].affects).toMatch(/uyar/)
  })
})

/** FAZ 6a-E: zaman çizelgesindeki içe aktarmalar kadroyu anlatır; aynı güne düşenler tek satır. */
describe('zaman çizelgesi görüntü satırları', () => {
  const snap = (id: number, takenAt: string, extra: Partial<CareerSnapshot> = {}): CareerSnapshot => ({ id, takenAt, source: 'IMPORT', playerCount: 21668, ...extra })

  it('aynı gün üç içe aktarma tek satır; dünya oyuncu sayısı yok, kadro sayısı ve net giren/çıkan var', () => {
    const rows = snapshotTimeline([
      snap(3, '2026-10-10T03:24:00Z', { squadCount: 31, squadJoined: ['C'], squadLeft: ['A'] }),
      snap(2, '2026-10-10T01:21:00Z', { squadCount: 31, squadJoined: ['A', 'B'], squadLeft: ['D'] }),
      snap(1, '2026-10-10T00:01:00Z', { squadCount: 30 }),
      snap(0, '2026-10-09T10:00:00Z', { squadCount: 30 }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ at: '2026-10-10T03:24:00Z' })
    expect(rows[0].text).toBe('İçe aktarma ×3 · kadro: 31 oyuncu · giren: B, C · çıkan: D')
    expect(rows[0].text).not.toContain('21668')
    expect(rows[1].text).toBe('İçe aktarma · kadro: 30 oyuncu')
  })

  it('kadro bilgisi olmayan eski görüntüde yalnız tür yazılır (sayı uydurulmaz)', () => {
    expect(snapshotTimeline([snap(1, '2026-10-10T00:01:00Z')])[0].text).toBe('İçe aktarma')
  })
})

/** KARIYER-UX 6: birleşik uyarı — zayıf halka + sözleşme; ilk 11 + yakın sözleşme bitişi. */
describe('birleşik uyarılar', () => {
  it('zayıf halka kartına oyuncunun sözleşmesi ≤ 12 ay ise kalan ay eklenir; daha uzunsa, yoksa ya da oyun tarihi yoksa eklenmez', () => {
    const cards = weakLinks([row('S1', 'WEAK', 30), row('S2', 'WEAK', 40), row('S3', 'WEAK', 50)])
    const squad = [member(1, {}, { contractUntil: '2027-07-15' }), member(2, {}, { contractUntil: '2029-06-30' }), member(3)]
    expect(withContracts(cards, squad, '2027-01-15').map((c) => c.contractMonths)).toEqual([6, undefined, undefined])
    expect(withContracts(cards, squad, undefined).every((c) => c.contractMonths === undefined)).toBe(true)
  })

  it('acil sözleşme uyarısı ilk 11 oyuncusunda "· ilk 11" der', () => {
    const squad = [member(1, {}, { contractUntil: '2027-04-01' }), member(2, {}, { contractUntil: '2027-04-01' })]
    expect(urgentAlerts(squad, '2027-01-15', new Set([1])).map((a) => a.text)).toEqual(['Oyuncu 1 · sözleşme 2 ay · ilk 11', 'Oyuncu 2 · sözleşme 2 ay'])
  })
})

/** FIT-1 madde 2: sunucunun iki eksenli sınıfı (weakClass) varsa seçim ve kart başlığı ondan; FitLabel kartta ikincil bilgi. */
describe('zayıf halkalar: iki eksenli sınıf', () => {
  const classed = (slotId: string, weakClass: SlotFitRow['weakClass'], fitLabel: RoleFit['fitLabel'], levelFit: number, currentFit: number): SlotFitRow => {
    const r = row(slotId, fitLabel, levelFit)
    const fit = { ...r.fit, currentFit, score: currentFit }
    return { ...r, fit, display: fitDisplay(fit), weakClass }
  }

  it('UYGUN olan (etiketi WRONG_ROLE olsa da) girmez; KALITE_ACIGI (etiketi GOOD olsa da) girer; sıra IKISI → KALITE_ACIGI → ROL_UYUMSUZ, sonra Güç artan', () => {
    const cards = weakLinks([
      classed('S1', 'UYGUN', 'WRONG_ROLE', 10, 80), classed('S2', 'KALITE_ACIGI', 'GOOD', 70, 55), classed('S3', 'ROL_UYUMSUZ', 'WRONG_ROLE', 20, 85),
      classed('S4', 'IKISI', 'WEAK', 30, 50), classed('S5', 'KALITE_ACIGI', 'AT_LEVEL', 50, 52),
    ], 5)
    expect(cards.map((c) => c.slotId)).toEqual(['S4', 'S5', 'S2', 'S3'])
    expect(cards.map((c) => c.classText)).toEqual(['Kalite açığı + rol uyumsuz', 'Kalite açığı', 'Kalite açığı', 'Rol uyumsuz'])
    expect(cards.find((c) => c.slotId === 'S3')?.primary).toBe('ROLE')
    expect(cards.find((c) => c.slotId === 'S4')?.primary).toBe('TRANSFER')
    expect(cards.find((c) => c.slotId === 'S2')).toMatchObject({ strength: 55, roleFit: 70, labelText: 'Rol için uygun' })
  })
})

describe('zayıf halkalar: sunucu etiketiyle seçilir', () => {
  it('FAZ 6a-G: yalnız WEAK/WRONG_ROLE; düşük levelFit önce; AT_LEVEL ve GOOD hiç girmez; üç dolmazsa daha az kart', () => {
    const cards = weakLinks([
      row('S1', 'GOOD', 20), row('S2', 'AT_LEVEL', 30), row('S3', 'WEAK', 55), row('S4', 'WRONG_ROLE', 60), row('S5', 'AT_LEVEL', 25),
    ])
    expect(cards.map((c) => c.slotId)).toEqual(['S3', 'S4'])
    expect(weakLinks([row('S6', 'WEAK', 40), row('S7', 'WEAK', 30), row('S8', 'WRONG_ROLE', 20), row('S9', 'WEAK', 10)]).map((c) => c.slotId)).toEqual(['S9', 'S8', 'S7'])
  })

  it('FIT-2: 11\'de alt üçte bir hep 3 kalite açığı verir; ilk 3\'te rol uyumsuzu yoksa en öndeki rol uyumsuzu 4. kart olur (Rolü değiştir görünsün)', () => {
    const classed = (slotId: string, weakClass: SlotFitRow['weakClass'], strength: number) => {
      const r = row(slotId, 'GOOD', 70)
      return { ...r, weakClass, display: { ...r.display, strength } }
    }
    const rows = [classed('S1', 'KALITE_ACIGI', 40), classed('S2', 'KALITE_ACIGI', 42), classed('S3', 'KALITE_ACIGI', 45), classed('S4', 'ROL_UYUMSUZ', 70), classed('S5', 'ROL_UYUMSUZ', 66), classed('S6', 'UYGUN', 60)]
    expect(weakLinks(rows).map((c) => c.slotId)).toEqual(['S1', 'S2', 'S3', 'S5'])
    expect(weakLinks(rows.filter((r) => r.weakClass !== 'ROL_UYUMSUZ')).map((c) => c.slotId)).toEqual(['S1', 'S2', 'S3'])
    expect(weakLinks(rows, Number.POSITIVE_INFINITY).map((c) => c.slotId)).toEqual(['S1', 'S2', 'S3', 'S5', 'S4'])
  })

  it('kartta etiket metni, levelFit yüzdesi ve ilk neden; renk tek başına sunulmaz', () => {
    const [card] = weakLinks([row('S2', 'WRONG_ROLE', 38.4, ['Stamina -7.5', 'SprintSpeed -2.0'])])
    expect(card.labelText).toBe('Rol için eksik')
    expect(card.pct).toBe(38)
    expect(card.reason).toBe('Dayanıklılık −7,5')
    expect(weakLinks([row('S3', 'WEAK', 50)])[0].labelText).toBe('Rol için sınırda')
  })
})

describe('neden metni (motorun reasons[0]\'ı: "<anahtar> <±puan>")', () => {
  it('öznitelik ve mevki anahtarı Türkçe, puan işaretli ve virgüllü; tanınmayan metin aynen', () => {
    expect(reasonText('GKPositioning -25.3')).toBe('Kaleci pozisyon −25,3')
    expect(reasonText('SprintSpeed +3.0')).toBe('Sprint hızı +3,0')
    expect(reasonText('ST -6.2')).toBe('Mevki uyumu (ST) −6,2')
    expect(reasonText('Dayanıklılık düşük')).toBe('Dayanıklılık düşük')
    expect(weakLinks([row('S2', 'WEAK', 30, ['StandingTackle -14.8'])])[0].reason).toBe('Ayakta müdahale −14,8')
  })

  it('zayıf kartta en büyük negatif katkı seçilir (pozitif en büyük olsa da); negatif yoksa neden yok', () => {
    expect(weakLinks([row('S2', 'WEAK', 30, ['SprintSpeed +12.0', 'Stamina -3.1', 'StandingTackle -9.4'])])[0].reason).toBe('Ayakta müdahale −9,4')
    expect(weakLinks([row('S2', 'WEAK', 30, ['SprintSpeed +12.0', 'Acceleration +2.0'])])[0].reason).toBeUndefined()
  })
})

describe('zayıf halka kartının birincil eylemi (FAZ 2 düzeltme 1)', () => {
  it('WRONG_ROLE → rolü değiştir (oyuncu iyi olabilir); WEAK → transferde aday', () => {
    const cards = weakLinks([row('S1', 'WRONG_ROLE', 10), row('S2', 'WEAK', 30)])
    expect(cards.map((c) => [c.slotId, c.primary])).toEqual([['S1', 'ROLE'], ['S2', 'TRANSFER']])
  })
})

describe('finansal sağlık', () => {
  const career = { id: 1, budgetEur: 6_000_000, wageBudgetEur: 40_000, windowEndsOn: '2027-01-31', gameDate: '2027-01-15' } as Career
  const snapshots = [
    { id: 9, takenAt: '2026-10-20T10:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 6_000_000, squadWageEur: 30_000 },
    { id: 8, takenAt: '2026-10-15T10:00:00Z', source: 'MANUAL', playerCount: 30, budgetEur: 1, squadWageEur: 1 },
    { id: 7, takenAt: '2026-10-10T10:00:00Z', source: 'IMPORT', playerCount: 30, budgetEur: 4_500_000, squadWageEur: 32_000 },
  ] as CareerSnapshot[]

  it('bütçe, maaş kullanımı, döneme kalan gün; Δ önceki IMPORT snapshot\'ına göre (MANUAL atlanır)', () => {
    const f = financeSummary({ career, squadWageEur: 30_000, squad: [member(1, { wageEur: 30_000 })], snapshots, gameDate: '2027-01-15' })
    expect(f.budget).toBe(6_000_000)
    expect(f.budgetDelta).toBe(1_500_000)
    expect(f.wageUse).toBe(75)
    expect(f.wageDelta).toBe(-2_000)
    expect(f.daysLeft).toBe(16)
    expect(f.unknownWages).toBe(0)
  })

  it('tek IMPORT varsa Δ yok; maaşı bilinmeyen oyuncu sayılır ve kullanım yüzdesi uydurulmaz', () => {
    const f = financeSummary({ career, squadWageEur: undefined, squad: [member(1, { wageEur: 9_000 }), member(2), member(3)], snapshots: [snapshots[0]], gameDate: '2027-01-15' })
    expect(f.budgetDelta).toBeUndefined()
    expect(f.unknownWages).toBe(2)
    expect(f.wageUse).toBeUndefined()
  })

  it('dönem sonu ya da oyun tarihi yoksa gün yok; bütçe ≤ 0 bilinmiyor', () => {
    const f = financeSummary({ career: { ...career, windowEndsOn: undefined, budgetEur: 0 }, squadWageEur: undefined, squad: [], snapshots: [], gameDate: '2027-01-15' })
    expect(f.daysLeft).toBeUndefined()
    expect(f.budget).toBeUndefined()
  })
})

describe('acil uyarılar', () => {
  const squad = [
    member(1, {}, { contractUntil: '2027-05-01' }),
    member(2, {}, { contractUntil: '2028-06-30' }),
    member(3, { onLoan: true, loanUntil: '2027-02-10' }),
    member(4, { onLoan: true, loanedOut: true, loanUntil: '2027-01-30' }, { contractUntil: '2027-03-01' }),
    member(5, { onLoan: true, loanUntil: '2027-06-30' }),
  ]

  it('≤ 6 ay sözleşme ve ≤ 30 gün kiralık dönüşü, en yakın önce; kiralık gönderilenin sözleşmesi sayılmaz', () => {
    const list = urgentAlerts(squad, '2027-01-15')
    expect(list.map((a) => `${a.kind}:${a.playerId}`)).toEqual(['LOAN:4', 'LOAN:3', 'CONTRACT:1'])
    expect(list[0].text).toBe('Oyuncu 4 kiralıktan dönüyor · 15 gün')
    expect(list[1].text).toBe('Oyuncu 3 kiralık süresi bitiyor · 26 gün')
    expect(list[2].text).toBe('Oyuncu 1 · sözleşme 3 ay')
    expect(list[2].to).toBe('/players/1?sekme=sozlesme')
    expect(list[0].to).toBe('/career/squad?sekme=hareketler')
  })

  it('oyun tarihi yoksa uyarı yok (bugünün tarihi kullanılmaz)', () => {
    expect(urgentAlerts(squad, undefined)).toEqual([])
  })
})

describe('zaman çizelgesi: gelecek olaylar istemcide türetilir', () => {
  it('dönem sonu, kiralık dönüşleri ve sözleşme bitişleri, tarihe göre; geçmiş tarih girmez', () => {
    const squad = [
      member(1, {}, { contractUntil: '2027-05-01' }),
      member(3, { onLoan: true, loanUntil: '2027-02-10' }),
      member(6, { onLoan: true, loanUntil: '2026-12-01' }),
    ]
    const events = upcomingEvents({ windowEndsOn: '2027-01-31' } as Career, squad, '2027-01-15')
    expect(events.map((e) => [e.date, e.text])).toEqual([
      ['2027-01-31', 'Transfer dönemi sonu'],
      ['2027-02-10', 'Oyuncu 3 · kiralık bitiyor'],
      ['2027-05-01', 'Oyuncu 1 · sözleşme bitiyor'],
    ])
  })
})
