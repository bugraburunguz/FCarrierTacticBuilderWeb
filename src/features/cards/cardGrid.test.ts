import { describe, expect, it } from 'vitest'
import { META_MIN_WIDTH, STATS_MIN_WIDTH } from '../../components/card/PlayerCard'
import { cardGridLayout, TILE_PAD_X } from './cardGrid'

// V3-05b-c: kart hücreyi doldurur (genişlik = hücre − dolgu); sütun sayısı kart ölçülmüş eşiğin altına düşmeyecek şekilde seçilir.
describe('kart ızgarası yerleşimi', () => {
  it.each([
    [320, 1],
    [343, 2],
    [736, 4],
    [1160, 6],
    [1400, 8],
  ])('%ipx kap: %i sütun, kart çip + 6 stat eşiğinin üstünde ve hücreyi dolduruyor', (width, cols) => {
    const layout = cardGridLayout(width)
    expect(layout.cols).toBe(cols)
    expect(layout.cardWidth).toBeGreaterThanOrEqual(META_MIN_WIDTH)
    expect(layout.cardWidth).toBeGreaterThanOrEqual(STATS_MIN_WIDTH)
    const cell = (width - layout.gap * (cols - 1)) / cols
    expect(layout.cardWidth).toBe(Math.floor(cell - 2 * TILE_PAD_X))
  })

  it('ölçülmemiş kap (0) için güvenli varsayılan: tek sütun yerine eşik genişliği', () => {
    expect(cardGridLayout(0).cardWidth).toBe(META_MIN_WIDTH)
  })
})
