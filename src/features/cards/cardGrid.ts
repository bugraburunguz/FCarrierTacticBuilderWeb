import { useEffect, useState, type RefObject } from 'react'
import { META_MIN_WIDTH } from '../../components/card/PlayerCard'

/** Izgara hücresinin yatay iç boşluğu (px, CardTile `px-2`) ve sütun aralığı (`gap-3`). */
export const TILE_PAD_X = 8
const GAP = 12
/** En küçük hücre: çipler + 6 stat ≥ 11px sığan kart (ölçülmüş eşik) + dolgu. */
const MIN_CELL = META_MIN_WIDTH + 2 * TILE_PAD_X

export interface CardGridLayout {
  cols: number
  gap: number
  /** Kart genişliği = hücre − dolgu (kart hücreyi doldurur). */
  cardWidth: number
}

/** Kap genişliğinden sütun sayısı: kart ölçülmüş eşiğin altına düşmeyecek en çok sütun. */
export function cardGridLayout(width: number): CardGridLayout {
  if (width <= 0) {
    return { cols: 1, gap: GAP, cardWidth: META_MIN_WIDTH }
  }
  const cols = Math.max(1, Math.floor((width + GAP) / (MIN_CELL + GAP)))
  const cell = (width - GAP * (cols - 1)) / cols
  return { cols, gap: GAP, cardWidth: Math.floor(cell - 2 * TILE_PAD_X) }
}

/** Öğenin boyutu: genişlik içerik (clientWidth), yükseklik kutu (offsetHeight). ResizeObserver; yoksa pencere yeniden boyutlanınca. */
export function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) {
      return undefined
    }
    const measure = () => setSize((cur) => (cur.width === el.clientWidth && cur.height === el.offsetHeight ? cur : { width: el.clientWidth, height: el.offsetHeight }))
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(el)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [ref])
  return size
}
