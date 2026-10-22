import { describe, expect, it } from 'vitest'
import { currentRoute, deskLink } from './deskLinks'

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
})

/** GEÇİCİ eşleme (FAZ 3/5'te kalkar): yeni sayfalar gelene kadar bugünkü Kadro/Transfer'in okuduğu parametrelere çevirir. */
describe('geçici eşleme: bugünkü sayfaların okuduğu parametreler', () => {
  it('Transfer: rol → bugünkü role takma adı da eklenir (TransferCenterPage pos+role okur)', () => {
    expect(currentRoute(deskLink.candidate('CM2', 'CM', 'b2b'))).toBe('/career/transfer?ihtiyac=slot-CM2&pos=CM&rol=b2b&role=b2b')
  })

  it('Transfer satış: sayfa açılır (satış planı aynı sayfada), parametreler zarar vermez', () => {
    expect(currentRoute(deskLink.sell(14))).toBe('/career/transfer?sekme=satis&oyuncu=14')
  })

  it('Kadro: /career/squad henüz yok → /squad; derinlik bugün "oyuncular" sekmesindeki mevki yoğunluğunda', () => {
    expect(currentRoute(deskLink.depth('MID'))).toBe('/squad?sekme=oyuncular&grup=MID')
    expect(currentRoute(deskLink.loans())).toBe('/squad?sekme=hareketler')
  })

  it('Lab: /career/tactics-lab henüz yok → kadro kurucu', () => {
    expect(currentRoute(deskLink.lab('CM2'))).toBe('/squad/builder?slot=CM2')
  })

  it('eşlemesi olmayan yol değişmez', () => {
    expect(currentRoute(deskLink.contract(14))).toBe('/players/14?sekme=sozlesme')
    expect(currentRoute('/career/growth?oyuncu=3')).toBe('/career/growth?oyuncu=3')
  })
})
