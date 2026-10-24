import { describe, expect, it } from 'vitest'
import * as deskLinks from './deskLinks'
import { deskLink } from './deskLinks'

describe('Masa geçişleri (15 §4.1 parametreleri)', () => {
  it('yeni rotalar ve parametreler', () => {
    expect(deskLink.candidate('CM2', 'CM', 'box_to_box_balanced')).toBe('/career/transfer?ihtiyac=slot-CM2&pos=CM&rol=box_to_box_balanced')
    expect(deskLink.lab('CM2')).toBe('/career/tactics-lab?sekme=kurucu&slot=CM2')
    expect(deskLink.contract(14)).toBe('/players/14?sekme=sozlesme')
    expect(deskLink.loans()).toBe('/career/squad?sekme=hareketler')
    expect(deskLink.sell(14)).toBe('/career/transfer?sekme=satis&oyuncu=14')
    expect(deskLink.depth('MID')).toBe('/career/squad?sekme=derinlik&grup=MID')
    expect(deskLink.settings()).toBe('/career/dashboard?sekme=ayarlar')
  })

  it('geçici eşleme kalmadı (KARIYER-UX FAZ 5): hedef sayfalar §4.1 parametrelerini doğrudan okur; modül yalnız deskLink dışa aktarır', () => {
    expect(Object.keys(deskLinks)).toEqual(['deskLink'])
  })
})
