import { describe, expect, it } from 'vitest'
import type { AcademyPlayer } from '../../api/types'
import { highlights, lineOf, parseLine, parseSort, potText, sortPlayers, STATUS_LABEL, visiblePlayers } from './academyRules'

const p = (id: number, extra: Partial<AcademyPlayer> = {}): AcademyPlayer => ({
  playerId: id, name: `Genç ${id}`, age: 16, positions: ['CM'], overall: 55, potential: 70, potentialRange: null, monthsInSquad: 3,
  youthVerified: false, bestPosition: 'CM', sideReason: null, conversionPosition: null, plan: null, promote: null, status: 'GROWING', loanedOut: false, ...extra,
})
const promote = (position: string, strength1: number, backupStrength: number | null = 60) =>
  ({ position, strength1, backupName: 'Yedek', backupStrength, text: `x · 1 sezon sonra tahmini ${position} gücü ${strength1}. Bu bir tahmin; A takıma alma oyunda yapılır.` })
const special = { name: 'Holding', label: 'CDM · Holding', text: 'metin', balanced: false }
const balanced = { name: 'Dengeli', label: 'Dengeli', text: 'metin', balanced: true }

/** ACADEMY-b §2: öne çıkan kartlar (en çok 3; kural tutmuyorsa kart yok), sıralama, hat filtresi, durum. */
describe('academyRules', () => {
  it('A takıma hazır: "A takıma al" önerisi olan, yedeği en çok geçen; yoksa kart yok', () => {
    const cards = highlights([p(1, { promote: promote('CM', 62, 60), status: 'READY' }), p(2, { promote: promote('CDM', 70, 61), status: 'READY' }), p(3)])
    const ready = cards.find((c) => c.kind === 'READY')!
    expect(ready.player.playerId).toBe(2)
    expect(ready.text).toBe('1 sezon sonra CDM yedeğini geçer')
    expect(ready.estimated).toBe(true)
    expect(highlights([p(1), p(2)]).some((c) => c.kind === 'READY')).toBe(false)
  })

  it('yedek yoksa metin boş yeri söyler', () => {
    const ready = highlights([p(1, { promote: promote('GK', 50, null), status: 'READY' })]).find((c) => c.kind === 'READY')!
    expect(ready.text).toBe('GK için yedek yok; 1 sezonda yer bulur')
  })

  it('En yüksek potansiyel: POT en yüksek; aralık modunda bant; hiç POT yoksa kart yok', () => {
    expect(highlights([p(1, { potential: 70 }), p(2, { potential: 82 })]).find((c) => c.kind === 'TOP_POTENTIAL')).toMatchObject({ player: { playerId: 2 }, text: 'POT 82' })
    const ranged = highlights([p(1, { potential: null, potentialRange: '70–74' }), p(2, { potential: null, potentialRange: '80–84' })])
    expect(ranged.find((c) => c.kind === 'TOP_POTENTIAL')).toMatchObject({ player: { playerId: 2 }, text: 'POT 80–84' })
    expect(highlights([p(1, { potential: null })]).some((c) => c.kind === 'TOP_POTENTIAL')).toBe(false)
    // Aynı bantta gelen sıra (gerçek POT) kartı belirlemez: OVR, sonra ad.
    const tie = highlights([p(1, { name: 'Zeki', potential: null, potentialRange: '80–84', overall: 50 }), p(2, { name: 'Ali', potential: null, potentialRange: '80–84', overall: 50 })])
    expect(tie.find((c) => c.kind === 'TOP_POTENTIAL')).toMatchObject({ player: { name: 'Ali' } })
  })

  it('Plan seçilmeli: Dengeli dışı plan önerilen oyuncu sayısı; hepsi Dengeli ya da plansızsa kart yok', () => {
    const cards = highlights([p(1, { plan: special }), p(2, { plan: special }), p(3, { plan: balanced }), p(4)])
    expect(cards.find((c) => c.kind === 'PLAN_NEEDED')).toMatchObject({ count: 2, text: '2 oyuncu için özel plan öneriliyor' })
    expect(highlights([p(1, { plan: balanced }), p(2)]).some((c) => c.kind === 'PLAN_NEEDED')).toBe(false)
  })

  it('en çok 3 kart, sabit sıra: A takıma hazır · En yüksek potansiyel · Plan seçilmeli', () => {
    const cards = highlights([p(1, { promote: promote('CM', 62), status: 'READY', plan: special }), p(2, { potential: 90 })])
    expect(cards.map((c) => c.kind)).toEqual(['READY', 'TOP_POTENTIAL', 'PLAN_NEEDED'])
  })

  it('GROWTH-CAL: aynı oyuncu iki kartta görünmez — En yüksek potansiyel, A takıma hazır oyuncuyu atlar ve sıradakini gösterir', () => {
    const cards = highlights([p(1, { potential: 90, promote: promote('CM', 62), status: 'READY' }), p(2, { potential: 80 }), p(3, { potential: 75 })])
    expect(cards.find((c) => c.kind === 'READY')).toMatchObject({ player: { playerId: 1 } })
    expect(cards.find((c) => c.kind === 'TOP_POTENTIAL')).toMatchObject({ player: { playerId: 2 }, text: 'POT 80' })
    // Tek oyuncu varsa ve o hazırsa potansiyel kartı çıkmaz.
    expect(highlights([p(1, { potential: 90, promote: promote('CM', 62), status: 'READY' })]).some((c) => c.kind === 'TOP_POTENTIAL')).toBe(false)
  })

  it('sıralama: Potansiyel (varsayılan, azalan; bant alt sınırı), Yaş (artan), Hazırlık (Hazır → Gelişiyor → Bekliyor)', () => {
    const list = [p(1, { potential: 70, age: 17, status: 'WAITING' }), p(2, { potential: null, potentialRange: '80–84', age: 15, status: 'GROWING' }),
      p(3, { potential: 75, age: 16, status: 'READY', promote: promote('CM', 62) })]
    expect(sortPlayers(list, 'potansiyel').map((x) => x.playerId)).toEqual([2, 3, 1])
    expect(sortPlayers(list, 'yas').map((x) => x.playerId)).toEqual([2, 3, 1])
    expect(sortPlayers(list, 'hazirlik').map((x) => x.playerId)).toEqual([3, 2, 1])
  })

  it('hat filtresi en iyi mevkiden (yoksa ilk mevki): Defans (GK dahil) · Orta saha · Hücum', () => {
    expect(lineOf(p(1, { bestPosition: 'CB' }))).toBe('defans')
    expect(lineOf(p(1, { bestPosition: null, positions: ['GK'] }))).toBe('defans')
    expect(lineOf(p(1, { bestPosition: 'CAM' }))).toBe('orta')
    expect(lineOf(p(1, { bestPosition: 'RW' }))).toBe('hucum')
    const list = [p(1, { bestPosition: 'CB' }), p(2, { bestPosition: 'ST' })]
    expect(visiblePlayers(list, 'potansiyel', 'hucum').map((x) => x.playerId)).toEqual([2])
    expect(visiblePlayers(list, 'potansiyel', 'tumu')).toHaveLength(2)
  })

  it('adres değerleri: geçersiz ya da boş → varsayılan', () => {
    expect(parseSort(null)).toBe('potansiyel')
    expect(parseSort('yas')).toBe('yas')
    expect(parseSort('bozuk')).toBe('potansiyel')
    expect(parseLine(null)).toBe('tumu')
    expect(parseLine('orta')).toBe('orta')
    expect(parseLine('bozuk')).toBe('tumu')
  })

  it('durum metinle; POT metni gerçek değer, yoksa bant, yoksa tire', () => {
    expect(STATUS_LABEL).toEqual({ READY: 'Hazır', GROWING: 'Gelişiyor', WAITING: 'Bekliyor' })
    expect(potText(p(1))).toBe('70')
    expect(potText(p(1, { potential: null, potentialRange: '70–74' }))).toBe('70–74')
    expect(potText(p(1, { potential: null }))).toBe('—')
  })
})
