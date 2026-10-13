import { describe, expect, it } from 'vitest'
import { faceAverages, type FaceCard } from './faceAverages'

const OUT = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY']
const GK = ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']

const outfield = (stats: number[], extra: Partial<FaceCard> = {}): FaceCard => ({ faceLabels: OUT, faceStats: stats, positions: ['ST'], ...extra })
const keeper = (stats: number[]): FaceCard => ({ faceLabels: GK, faceStats: stats, positions: ['GK'] })
const valueOf = (cards: FaceCard[], label: string) => faceAverages(cards).find((a) => a.label === label)?.value

describe('faceAverages (F10)', () => {
  it('kalecinin DIV değeri PAC ortalamasına karışmaz (etiketle ortalama, dizi sırasıyla değil)', () => {
    const cards = [outfield([90, 80, 70, 60, 50, 40]), outfield([70, 60, 50, 40, 30, 20]), keeper([99, 10, 10, 10, 10, 10])]

    expect(valueOf(cards, 'PAC')).toBe(80)
    expect(valueOf(cards, 'PHY')).toBe(30)
  })

  it('yalnız kaleci seçiliyse altı ortalama da boş kalır', () => {
    expect(faceAverages([keeper([80, 80, 80, 80, 80, 80])]).every((a) => a.value === undefined)).toBe(true)
  })

  it('etiketi olmayan eski kayıtta kaleci mevkii dışarıda bırakılır, saha oyuncusu sayılır', () => {
    const legacy: FaceCard = { faceStats: [60, 60, 60, 60, 60, 60], faceLabels: [], positions: ['CM'] }
    const legacyKeeper: FaceCard = { faceStats: [90, 90, 90, 90, 90, 90], faceLabels: [], positions: ['GK'] }

    expect(valueOf([legacy, legacyKeeper], 'PAC')).toBe(60)
  })

  it('yüz değeri olmayan kart (katalog, hesap yok) ortalamayı bozmaz', () => {
    expect(valueOf([outfield([70, 70, 70, 70, 70, 70]), { positions: ['ST'] }], 'DRI')).toBe(70)
  })

  it('hesaplanan ve ağırlığı doğrulanmamış değer katkı verdiyse ortalama yaklaşık işaretlenir', () => {
    const exact = outfield([70, 70, 70, 70, 70, 70], { faceStatsSource: 'OFFICIAL' })
    const approx = outfield([80, 80, 80, 80, 80, 80], { faceStatsSource: 'COMPUTED', faceStatsApproximate: true })

    expect(faceAverages([exact]).every((a) => !a.approximate)).toBe(true)
    expect(faceAverages([exact, approx]).every((a) => a.approximate)).toBe(true)
  })
})
