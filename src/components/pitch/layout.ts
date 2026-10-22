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
  /** İşaret: FC kartı (varsayılan) ya da Cyber-Pitch piyonu (KARIYER-UX). */
  marker?: Marker
  /** Piyonda rol etiketi (kartta her zaman var). */
  showRole?: boolean
}

export type Marker = 'card' | 'pawn'

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
/** Piyon sahası daha kısa olabilir (kart yüksekliği yok); yine de dikey saha oranını korur. */
const PAWN_MIN_ASPECT = 1.15

/** Piyon: daire en az 32px (kart ≥56 iken 40), dokunma kutusu en az 44px (Q13); isim hapı 18px. */
export const PAWN_TOUCH = 44
const PAWN_MIN = 32
const PAWN_MIN_WIDE = 40
const PAWN_RATIO = 0.62
const NAME_PILL_HEIGHT = 18

export interface MarkerBox {
  width: number
  height: number
  /** Piyon dairesinin çapı (kartta 0). */
  diameter: number
}

/** İşaretin kutusu: kart = kart + zincir göstergesi; piyon = dokunma kutusu (daire içinde ortalı). */
export function markerBox(marker: Marker, cardWidth: number): MarkerBox {
  if (marker === 'card') {
    return { width: cardWidth, height: Math.round(cardWidth * CARD_HEIGHT_RATIO) + CHAIN_HEIGHT, diameter: 0 }
  }
  const diameter = Math.max(cardWidth >= 56 ? PAWN_MIN_WIDE : PAWN_MIN, Math.round(cardWidth * PAWN_RATIO))
  const side = Math.max(PAWN_TOUCH, diameter)
  return { width: side, height: side, diameter }
}

interface Shape {
  mode: LabelMode
  marker: Marker
  showRole: boolean
}

const CARD_SHAPE = (mode: LabelMode): Shape => ({ mode, marker: 'card', showRole: true })

export function labelWidthOf(cardWidth: number, mode: LabelMode): number {
  return mode === 'one' ? ONE_LINE_LABEL_WIDTH : Math.max(FULL_LABEL_WIDTH, cardWidth)
}

export function groupWidthOf(cardWidth: number, mode: LabelMode, shape: Shape = CARD_SHAPE(mode)): number {
  if (shape.marker === 'pawn') {
    return Math.max(markerBox('pawn', cardWidth).width, shape.showRole ? labelWidthOf(cardWidth, mode) : ONE_LINE_LABEL_WIDTH)
  }
  return Math.max(cardWidth, labelWidthOf(cardWidth, mode))
}

export function groupHeightOf(cardWidth: number, mode: LabelMode, shape: Shape = CARD_SHAPE(mode)): number {
  const role = shape.showRole ? LABEL_GAP + LABEL_HEIGHT[mode] : 0
  if (shape.marker === 'pawn') {
    return markerBox('pawn', cardWidth).height + LABEL_GAP + NAME_PILL_HEIGHT + role + PILL_GAP + PILL_HEIGHT
  }
  return markerBox('card', cardWidth).height + role + PILL_GAP + PILL_HEIGHT
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

function requiredHeight(rows: number, cardWidth: number, shape: Shape): number {
  return 2 * PAD_Y + rows * groupHeightOf(cardWidth, shape.mode, shape) + (rows - 1) * GAP_Y
}

function place(rows: LayoutSlot[][], cardWidth: number, shape: Shape, width: number, fieldHeight: number): GroupBox[] {
  const gw = groupWidthOf(cardWidth, shape.mode, shape)
  const gh = groupHeightOf(cardWidth, shape.mode, shape)
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

export function layoutPitch({ slots, width, height, narrow, minCard = MIN_CARD, marker = 'card', showRole = false }: LayoutInput): PitchLayout {
  const modes: LabelMode[] = narrow ? ['one'] : ['full']
  const widthCard = Math.round(Math.min(MAX_CARD, Math.max(minCard, width * CARD_RATIO)))
  const shapeOf = (mode: LabelMode): Shape => ({ mode, marker, showRole: marker === 'card' || showRole })
  if (height === undefined) {
    const shape = shapeOf(modes[0])
    const rows = buildRows(slots, groupWidthOf(widthCard, shape.mode, shape), width)
    const fieldHeight = Math.max(requiredHeight(rows.length, widthCard, shape), Math.round(width * (marker === 'pawn' ? PAWN_MIN_ASPECT : MIN_ASPECT)))
    return { cardWidth: widthCard, labelWidth: labelWidthOf(widthCard, shape.mode), labelMode: shape.mode, fieldHeight, boxes: place(rows, widthCard, shape, width, fieldHeight), fits: true }
  }
  let fallback: PitchLayout | undefined
  for (const [pass, mode] of modes.entries()) {
    const shape = shapeOf(mode)
    for (let card = widthCard; card >= minCard; card -= 1) {
      const rows = buildRows(slots, groupWidthOf(card, mode, shape), width)
      if (requiredHeight(rows.length, card, shape) <= height) {
        return { cardWidth: card, labelWidth: labelWidthOf(card, mode), labelMode: mode, fieldHeight: height, boxes: place(rows, card, shape, width, height), fits: true }
      }
    }
    if (pass === modes.length - 1) {
      const rows = buildRows(slots, groupWidthOf(minCard, mode, shape), width)
      const need = requiredHeight(rows.length, minCard, shape)
      fallback = { cardWidth: minCard, labelWidth: labelWidthOf(minCard, mode), labelMode: mode, fieldHeight: need, boxes: place(rows, minCard, shape, width, need), fits: false }
    }
  }
  return fallback as PitchLayout
}

/** İki grup kutusu kesişiyor mu (Q17). */
export function overlaps(a: GroupBox, b: GroupBox): boolean {
  return Math.abs(a.cx - b.cx) < (a.width + b.width) / 2 && a.top < b.top + b.height && b.top < a.top + a.height
}
