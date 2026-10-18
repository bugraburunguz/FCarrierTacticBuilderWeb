import { describe, expect, it } from 'vitest'
import { displayName, isRealName } from './assetNames'
import { UNKNOWN_NAME, cleanPlayerNames } from './playerName'

describe('adı çözülemeyen oyuncu ("Oyuncu #203244")', () => {
  it('yanıttaki name/playerName alanında tam biçim "Adı bilinmiyor" olur; diğer alanlar ve gerçek adlar değişmez', () => {
    const data = {
      items: [{ id: 1, name: 'Oyuncu #203244', club: 'Oyuncu #1 FC' }, { id: 2, name: 'Pedri' }],
      events: [{ playerName: 'Oyuncu #5', note: 'Oyuncu #5' }],
      player: { name: 'Oyuncu #12 Junior' },
    }
    expect(cleanPlayerNames(data)).toEqual({
      items: [{ id: 1, name: UNKNOWN_NAME, club: 'Oyuncu #1 FC' }, { id: 2, name: 'Pedri' }],
      events: [{ playerName: UNKNOWN_NAME, note: 'Oyuncu #5' }],
      player: { name: 'Oyuncu #12 Junior' },
    })
  })

  it('kart şeridi "OYUNCU"/"BİLİNMİYOR" yazmaz: mevki + reyting gösterir', () => {
    expect(isRealName('Oyuncu #190042')).toBe(false)
    expect(isRealName(UNKNOWN_NAME)).toBe(false)
    expect(displayName(null, UNKNOWN_NAME, 'CAM', 95)).toEqual({ strip: 'CAM 95', title: 'Ad bilinmiyor' })
  })
})
