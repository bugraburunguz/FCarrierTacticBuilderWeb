/*
 * Saha yerleşimi (F1, 11 §8 Q17): slot grubu (kart + zincir göstergesi + rol etiketi + mevki rozeti) bir birimdir.
 * Satır bantları formasyonun dikey katmanlarından kurulur (kaleci kendi bandında); sığmayan katman iki alt banda bölünür,
 * birbirine yakın ve yatayda çakışmayan katmanlar tek bantta birleşir. Gruplar hiçbir zaman kesişmez.
 */
/** 'full': tam rol adı (kısaltmasız), en çok 2 satır; 'one': dar ekranda tek satırlık kısa form. */
export type LabelMode = 'full' | 'one'

export interface LayoutSlot {
  slotId: string
  /** Yüzde (0-100): formasyonun yatay/dikey konumu; yalnız sıralama ve yatay hedef için kullanılır. */
  x: number
  y: number
}

export interface GroupBox {
  slotId: string
  /** Grubun yatay merkezi ve üst kenarı (px, saha içi). */
  cx: number
  top: number
  width: number
  height: number
  row: number
}

export interface PitchLayout {
  cardWidth: number
  labelWidth: number
  labelMode: LabelMode
  fieldHeight: number
  boxes: GroupBox[]
  /** Gruplar verilen yüksekliğe sığdı mı (sabit yükseklik verilmediyse hep true). */
  fits: boolean
}

export interface LayoutInput {
  slots: LayoutSlot[]
  width: number
  /** Verilirse saha bu yüksekliğe ölçeklenir (masaüstü); verilmezse içerik kadar uzar (mobil). */
  height?: number
  /** Dar ekran: rol etiketi tek satırlık kısa form. */
  narrow: boolean
  /** En küçük kart genişliği (Q18): ≥1024px'te 56, 375'te 48. Sığmazsa saha uzar (sayfa kayar), kart küçülmez. */
  minCard?: number
}

const CARD_RATIO = 0.13
export const MIN_CARD = 48
const MAX_CARD = 96
const CARD_HEIGHT_RATIO = 1.39
const CHAIN_HEIGHT = 12
const LABEL_GAP = 4
const PILL_GAP = 2
const PILL_HEIGHT = 18
const LABEL_HEIGHT: Record<LabelMode, number> = { full: 36, one: 22 }
const FULL_LABEL_WIDTH = 150
const ONE_LINE_LABEL_WIDTH = 96
const GAP_X = 6
const GAP_Y = 8
const PAD_X = 6
const PAD_Y = 8
const LAYER_GAP_PCT = 4
const MERGE_Y_PCT = 17
const MIN_ASPECT = 1.35

export function labelWidthOf(cardWidth: number, mode: LabelMode): number {
  return mode === 'one' ? ONE_LINE_LABEL_WIDTH : Math.max(FULL_LABEL_WIDTH, cardWidth)
}

export function groupWidthOf(cardWidth: number, mode: LabelMode): number {
  return Math.max(cardWidth, labelWidthOf(cardWidth, mode))
}

export function groupHeightOf(cardWidth: number, mode: LabelMode): number {
  return Math.round(cardWidth * CARD_HEIGHT_RATIO) + CHAIN_HEIGHT + LABEL_GAP + LABEL_HEIGHT[mode] + PILL_GAP + PILL_HEIGHT
}

const usable = (width: number) => width - 2 * PAD_X

function fitsInRow(sorted: LayoutSlot[], groupWidth: number, width: number): boolean {
  const need = sorted.length * groupWidth + (sorted.length - 1) * GAP_X
  return need <= usable(width)
}

/** Katmanlar: y'ye göre sıralı, aralarında LAYER_GAP_PCT'den büyük boşluk olan öbekler. */
function layers(slots: LayoutSlot[]): LayoutSlot[][] {
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x)
  const result: LayoutSlot[][] = []
  sorted.forEach((slot) => {
    const last = result[result.length - 1]
    if (last && slot.y - last[last.length - 1].y <= LAYER_GAP_PCT) {
      last.push(slot)
    } else {
      result.push([slot])
    }
  })
  return result
}

const meanY = (row: LayoutSlot[]) => row.reduce((sum, slot) => sum + slot.y, 0) / row.length

/** İki bant yakınsa (ortalama y farkı ≤ MERGE_Y_PCT) ve gruplar yatayda ayrık duruyorsa tek bantta birleşebilir. */
function canMerge(a: LayoutSlot[], b: LayoutSlot[], groupWidth: number, width: number): boolean {
  if (Math.abs(meanY(a) - meanY(b)) > MERGE_Y_PCT) {
    return false
  }
  const merged = [...a, ...b].sort((p, q) => p.x - q.x)
  if (!fitsInRow(merged, groupWidth, width)) {
    return false
  }
  return merged.every((slot, i) => i === 0 || ((slot.x - merged[i - 1].x) / 100) * width >= groupWidth + GAP_X)
}

/** En yakın iki bant önce birleşir (kaleci ve çizgi şekli korunur: yatayda çakışan bantlar hiç birleşmez). */
function mergeBands(bands: LayoutSlot[][], groupWidth: number, width: number): LayoutSlot[][] {
  const rows = bands.map((b) => [...b])
  for (;;) {
    let best = -1
    let bestGap = Infinity
    for (let i = 0; i < rows.length - 1; i += 1) {
      const gap = Math.abs(meanY(rows[i]) - meanY(rows[i + 1]))
      if (gap < bestGap && canMerge(rows[i], rows[i + 1], groupWidth, width)) {
        best = i
        bestGap = gap
      }
    }
    if (best < 0) {
      return rows
    }
    rows.splice(best, 2, [...rows[best], ...rows[best + 1]])
  }
}

/** Sığmayan bant, x sırasına göre dönüşümlü alt bantlara bölünür. */
function splitRow(row: LayoutSlot[], groupWidth: number, width: number): LayoutSlot[][] {
  const sorted = [...row].sort((a, b) => a.x - b.x)
  for (let parts = 1; parts <= sorted.length; parts += 1) {
    const buckets: LayoutSlot[][] = Array.from({ length: parts }, () => [])
    sorted.forEach((slot, i) => buckets[i % parts].push(slot))
    if (buckets.every((b) => fitsInRow(b, groupWidth, width))) {
      return buckets
    }
  }
  return sorted.map((s) => [s])
}

export function buildRows(slots: LayoutSlot[], groupWidth: number, width: number): LayoutSlot[][] {
  const merged = mergeBands(layers(slots), groupWidth, width)
  return merged.flatMap((row) => (fitsInRow([...row].sort((a, b) => a.x - b.x), groupWidth, width) ? [row] : splitRow(row, groupWidth, width)))
}

function requiredHeight(rows: number, cardWidth: number, mode: LabelMode): number {
  return 2 * PAD_Y + rows * groupHeightOf(cardWidth, mode) + (rows - 1) * GAP_Y
}

function place(rows: LayoutSlot[][], cardWidth: number, mode: LabelMode, width: number, fieldHeight: number): GroupBox[] {
  const gw = groupWidthOf(cardWidth, mode)
  const gh = groupHeightOf(cardWidth, mode)
  const free = fieldHeight - 2 * PAD_Y - rows.length * gh
  const gap = rows.length > 1 ? Math.max(GAP_Y, free / (rows.length - 1)) : 0
  const half = gw / 2
  const min = PAD_X + half
  const max = width - PAD_X - half
  return rows.flatMap((row, index) => {
    const sorted = [...row].sort((a, b) => a.x - b.x)
    const cx = sorted.map((s) => Math.min(max, Math.max(min, (s.x / 100) * width)))
    for (let i = 1; i < cx.length; i += 1) {
      cx[i] = Math.max(cx[i], cx[i - 1] + gw + GAP_X)
    }
    cx[cx.length - 1] = Math.min(cx[cx.length - 1], max)
    for (let i = cx.length - 2; i >= 0; i -= 1) {
      cx[i] = Math.min(cx[i], cx[i + 1] - gw - GAP_X)
    }
    return sorted.map((slot, i) => ({ slotId: slot.slotId, cx: cx[i], top: PAD_Y + index * (gh + gap), width: gw, height: gh, row: index }))
  })
}

export function layoutPitch({ slots, width, height, narrow, minCard = MIN_CARD }: LayoutInput): PitchLayout {
  const modes: LabelMode[] = narrow ? ['one'] : ['full']
  const widthCard = Math.round(Math.min(MAX_CARD, Math.max(minCard, width * CARD_RATIO)))
  if (height === undefined) {
    const mode = modes[0]
    const rows = buildRows(slots, groupWidthOf(widthCard, mode), width)
    const fieldHeight = Math.max(requiredHeight(rows.length, widthCard, mode), Math.round(width * MIN_ASPECT))
    return { cardWidth: widthCard, labelWidth: labelWidthOf(widthCard, mode), labelMode: mode, fieldHeight, boxes: place(rows, widthCard, mode, width, fieldHeight), fits: true }
  }
  let fallback: PitchLayout | undefined
  for (const [pass, mode] of modes.entries()) {
    for (let card = widthCard; card >= minCard; card -= 1) {
      const rows = buildRows(slots, groupWidthOf(card, mode), width)
      if (requiredHeight(rows.length, card, mode) <= height) {
        return { cardWidth: card, labelWidth: labelWidthOf(card, mode), labelMode: mode, fieldHeight: height, boxes: place(rows, card, mode, width, height), fits: true }
      }
    }
    if (pass === modes.length - 1) {
      const rows = buildRows(slots, groupWidthOf(minCard, mode), width)
      const need = requiredHeight(rows.length, minCard, mode)
      fallback = { cardWidth: minCard, labelWidth: labelWidthOf(minCard, mode), labelMode: mode, fieldHeight: need, boxes: place(rows, minCard, mode, width, need), fits: false }
    }
  }
  return fallback as PitchLayout
}

/** İki grup kutusu kesişiyor mu (Q17). */
export function overlaps(a: GroupBox, b: GroupBox): boolean {
  return Math.abs(a.cx - b.cx) < (a.width + b.width) / 2 && a.top < b.top + b.height && b.top < a.top + a.height
}
