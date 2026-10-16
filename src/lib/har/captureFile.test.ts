import { describe, expect, it } from 'vitest'
import { CaptureFileError, DEFAULT_CAPTURE_RULES, parseCaptureFile, summarizeCaptures } from './harCapture'

// V3-05c-c: uzantının dışa aktardığı yakalama dosyası ({url, status, ts, body}[]) HAR ile aynı süzgeçten geçer. Sentetik veri.
const UT = 'https://utas.mob.v1.prd.futc-ext.gcp.ea.com/ut/game/fc27'
const market = JSON.stringify({ auctionInfo: [{ tradeId: 91, sellerName: 'SIZINTI-SATICI', itemData: { id: 5, rating: 80 } }] })
const FILE = [
  { url: `${UT}/sbs/hub/v2`, status: 200, ts: 1000, body: JSON.stringify({ categories: [{ sets: [{ setId: 1 }, { setId: 2 }] }] }) },
  { url: `${UT}/club`, status: 200, ts: 1001, body: JSON.stringify({ itemData: [{ id: 1 }] }) },
  { url: `${UT}/transfermarket?num=21`, status: 200, ts: 1002, body: market },
  { url: 'https://accounts.ea.com/connect/auth?x=1', status: 200, ts: 1003, body: '{"access_token":"SIZINTI-TOKEN"}' },
  { url: 'fcareer://discovery', status: 200, ts: 1004, body: '["/ut/game/fc27/club"]' },
  { url: `${UT}/sbs/setId/1/challenges`, status: 500, ts: 1005, body: '{}' },
  { url: `${UT}/objective/list`, status: 200, ts: 1006, body: 'not json' },
  { bogus: true },
]

describe('yakalama dosyası ayrıştırıcı', () => {
  it('kişisel: kişisel eşleşenler kalır; yetki/oturum, keşif, 200 dışı, JSON olmayan ve bozuk girdi atlanır', () => {
    const result = parseCaptureFile(JSON.stringify(FILE), { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })
    expect(result.captures.map((c) => c.url)).toEqual([`${UT}/sbs/hub/v2`, `${UT}/club`, `${UT}/transfermarket?num=21`])
    expect(result.captures[0]).toEqual({ url: `${UT}/sbs/hub/v2`, status: 200, ts: 1000, body: FILE[0].body })
    expect(result.skipped).toMatchObject({ total: 8, denied: 1, notOk: 1, notJson: 1 })
    expect(JSON.stringify(result)).not.toContain('SIZINTI-TOKEN')
  })

  it('katkı: personalOnly (kulüp) alınmaz, stripFields uygulanır (HAR ile aynı kural kaynağı)', () => {
    const result = parseCaptureFile(JSON.stringify(FILE), { mode: 'CONTRIB', rules: DEFAULT_CAPTURE_RULES })
    expect(result.captures.map((c) => c.url)).toEqual([`${UT}/sbs/hub/v2`, `${UT}/transfermarket?num=21`])
    const body = result.captures[1].body
    expect(body).not.toContain('SIZINTI-SATICI')
    expect(body).not.toContain('tradeId')
    expect(JSON.parse(body).auctionInfo[0].itemData.rating).toBe(80)
  })

  it('özet: kulüp sayfaları tekrar yakalandıysa kart kimliği bir kez sayılır (gerçek dosyada 22 yanıt / 1246 öğe / 139 kart)', () => {
    const page = (ids: number[]) => ({ url: `${UT}/club`, status: 200, ts: 1, body: JSON.stringify({ itemData: ids.map((id) => ({ id })) }) })
    expect(summarizeCaptures([page([1, 2, 3]), page([2, 3, 4]), page([1])]).clubCards).toBe(4)
  })

  it('{captures: [...]} sarmalı da kabul edilir; liste değilse anlaşılır hata', () => {
    expect(parseCaptureFile(JSON.stringify({ captures: FILE.slice(0, 1) }), { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES }).captures).toHaveLength(1)
    expect(() => parseCaptureFile('{"log":{}}', { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })).toThrow(CaptureFileError)
    expect(() => parseCaptureFile('bozuk', { mode: 'PERSONAL', rules: DEFAULT_CAPTURE_RULES })).toThrow('geçerli bir JSON değil')
  })
})
