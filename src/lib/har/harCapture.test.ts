import { describe, expect, it } from 'vitest'
import sampleHar from '../../../tests/fixtures/har/sample.har?raw'
import { DEFAULT_CAPTURE_RULES, HarError, MAX_BODY_BYTES, MAX_FILE_BYTES, assertHarFileSize, parseHar, summarizeCaptures } from './harCapture'

// HAR-01: sentetik HAR (gerçek kişisel veri yok). Başlık/çerez/postData değerleri "SIZINTI-…" ile işaretli; çıktının hiçbir yerinde geçmemeli.
const SECRETS = ['SIZINTI-AUTH-111', 'SIZINTI-COOKIE-222', 'SIZINTI-UTSID-333', 'SIZINTI-SETCOOKIE-444', 'SIZINTI-POST-666', 'SIZINTI-AUTHBODY-777']
const UT = 'https://utas.mob.v1.prd.futc-ext.gcp.ea.com/ut/game/fc27'

describe('HAR ayrıştırıcı: kişisel mod', () => {
  const result = parseHar(sampleHar, { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })

  it('yalnız eşleşen, 200 ve JSON gövdeler; uzantı biçimi {url, status, ts, body}', () => {
    expect(result.captures.map((c) => c.url)).toEqual([
      `${UT}/sbs/hub`, `${UT}/sbs/setId/9036/challenges`, `${UT}/club`, `${UT}/transfermarket?num=21&type=player`, `${UT}/objective/list`,
    ])
    for (const c of result.captures) {
      expect(Object.keys(c).sort()).toEqual(['body', 'status', 'ts', 'url'])
      expect(c.status).toBe(200)
      expect(typeof c.body).toBe('string')
    }
    expect(result.captures[0].ts).toBe(Date.parse('2026-10-15T10:00:00.000Z'))
  })

  it('base64 gövde UTF-8 olarak çözülür', () => {
    expect(JSON.parse(result.captures[1].body).challenges[1].name).toBe('Görev İki')
  })

  it('header, cookie ve postData değerleri çıktının hiçbir yerinde geçmez', () => {
    const everything = JSON.stringify(result)
    for (const secret of SECRETS) {
      expect(everything).not.toContain(secret)
    }
    expect(everything).not.toMatch(/"(headers|cookies|postData)"/)
  })

  it('atlananlar sayılır: deny (auth), JSON olmayan, 4xx, eşleşmeyen', () => {
    expect(result.skipped).toEqual({ total: 9, denied: 1, unmatched: 1, notOk: 1, notJson: 1, tooLarge: 0 })
  })

  it('özet: SBC seti/görevi, kulüp kartı, fiyat gözlemi, objective', () => {
    expect(summarizeCaptures(result.captures)).toEqual({ sbcSets: 2, sbcChallenges: 2, clubCards: 3, priceObservations: 2, objectives: 2 })
  })
})

describe('HAR ayrıştırıcı: katkı modu', () => {
  const result = parseHar(sampleHar, { mode: 'CONTRIB', rules: DEFAULT_CAPTURE_RULES })

  it('kişisel uçlar (personalOnly: kulüp) hiç alınmaz; deny yine uygulanır', () => {
    const urls = result.captures.map((c) => c.url)
    expect(urls).not.toContain(`${UT}/club`)
    expect(urls.some((u) => u.includes('/auth'))).toBe(false)
    expect(urls).toEqual([`${UT}/sbs/hub`, `${UT}/sbs/setId/9036/challenges`, `${UT}/transfermarket?num=21&type=player`, `${UT}/objective/list`])
  })

  it('stripFields: satıcı/alıcı alanları gövdeden silinir', () => {
    const market = JSON.parse(result.captures[2].body)
    expect(market.auctionInfo[0]).not.toHaveProperty('sellerName')
    expect(market.auctionInfo[0]).not.toHaveProperty('sellerId')
    expect(market.auctionInfo[0]).not.toHaveProperty('tradeId')
    expect(market.auctionInfo[0].buyNowPrice).toBe(1200)
    expect(JSON.stringify(result)).not.toContain('SIZINTI-SATICI-555')
  })

  it('sunucu kuralları gömülü varsayılanın yerini alır (tek kaynak)', () => {
    const rules = { ...DEFAULT_CAPTURE_RULES, deny: [...DEFAULT_CAPTURE_RULES.deny, '/objective/'] }
    expect(parseHar(sampleHar, { mode: 'CONTRIB', rules }).captures.some((c) => c.url.includes('/objective/'))).toBe(false)
  })
})

describe('sınırlar ve hatalar', () => {
  it(`gövde ${MAX_BODY_BYTES / 1024 / 1024} MB üstündeyse atlanır ve sayılır`, () => {
    const big = JSON.stringify({ log: { entries: [{ startedDateTime: '2026-10-15T10:00:00Z', request: { url: `${UT}/club` }, response: { status: 200, content: { text: `{"x":"${'a'.repeat(MAX_BODY_BYTES)}"}` } } }] } })
    const result = parseHar(big, { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })
    expect(result.captures).toHaveLength(0)
    expect(result.skipped.tooLarge).toBe(1)
  })

  it(`dosya ${MAX_FILE_BYTES / 1024 / 1024} MB üstündeyse anlaşılır hata`, () => {
    expect(() => assertHarFileSize(MAX_FILE_BYTES + 1)).toThrow(new HarError('Dosya çok büyük (en çok 150 MB). Daha kısa bir oturumla yeniden dışa aktar.'))
    expect(() => assertHarFileSize(MAX_FILE_BYTES)).not.toThrow()
  })

  it('geçersiz JSON ve HAR olmayan dosya için Türkçe hata', () => {
    expect(() => parseHar('{bozuk', { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })).toThrow('Dosya geçerli bir HAR (JSON) değil.')
    expect(() => parseHar('{"captures":[]}', { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })).toThrow('Bu bir HAR dosyası değil: "log.entries" bulunamadı.')
  })
})
