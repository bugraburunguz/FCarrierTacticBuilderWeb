/** Saha oyuncusunun 6 yüz istatistiği etiketi (kalecide DIV/HAN/KIC/REF/SPD/POS: ortalamaya girmez). */
export const OUTFIELD_FACE_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const

export interface FaceCard {
  faceStats?: number[]
  faceLabels?: string[]
  faceStatsSource?: string
  faceStatsApproximate?: boolean
  positions?: string[]
}

export interface FaceAverage {
  label: string
  value?: number
  /** Katkı veren değerlerden en az biri ağırlığı doğrulanmamış formülle hesaplandı. */
  approximate: boolean
}

/** Kalecinin etiket kümesi saha oyuncusundan farklıdır; etiketi olmayan eski kayıtta mevkiye bakılır. */
function isOutfield(card: FaceCard): boolean {
  if (card.faceLabels && card.faceLabels.length > 0) {
    return card.faceLabels.includes(OUTFIELD_FACE_LABELS[0])
  }
  return !(card.positions ?? []).includes('GK')
}

/** Etikete göre ortalama (dizi sırasına göre değil); yalnız saha oyuncuları, kaleciler dışarıda. */
export function faceAverages(cards: FaceCard[]): FaceAverage[] {
  const field = cards.filter((c) => (c.faceStats?.length ?? 0) >= OUTFIELD_FACE_LABELS.length && isOutfield(c))
  return OUTFIELD_FACE_LABELS.map((label, i) => {
    const values = field.map((c) => {
      const index = c.faceLabels && c.faceLabels.length > 0 ? c.faceLabels.indexOf(label) : i
      return index >= 0 ? c.faceStats![index] : undefined
    }).filter((v): v is number => v !== undefined)
    return {
      label,
      value: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined,
      approximate: field.some((c) => c.faceStatsApproximate === true && c.faceStatsSource !== 'OFFICIAL'),
    }
  })
}
