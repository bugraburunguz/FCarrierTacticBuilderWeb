/**
 * HAR-01: DevTools'tan dışa aktarılan HAR 1.2 dosyasından yakalama listesi (uzantının ürettiği biçim: {url, status, ts, body}).
 * Gizlilik: her girdiden YALNIZ request.url, response.status, startedDateTime ve response.content.text (+ encoding) okunur (`pick`).
 * İstek/yanıt başlıkları, çerezler ve postData hiç okunmaz, kopyalanmaz, hiçbir yere gönderilmez.
 * Kurallar uzantıyla aynı tek kaynaktan (GET /ut/capture/rules); ulaşılamazsa gömülü varsayılan. Eşleme mantığı extension/rules.js ile aynı.
 * Saf modül: Web Worker'da (harWorker.ts) ve testte aynen çalışır.
 */

export interface CaptureRules {
  deny: string[]
  personalOnly: string[]
  personalMatch: string[]
  contrib: { match: string[]; stripFields: string[] }
}

/** Gömülü varsayılan: extension/rules.js DEFAULTS ile aynı (sunucu kuralları gelmezse). */
export const DEFAULT_CAPTURE_RULES: CaptureRules = {
  deny: ['/auth', 'accountinfo', 'connect', 'nucleus', 'phishing', '/fc/user/season', 'sid='],
  personalOnly: ['/club', '/user/credits', '/tradepile', '/watchlist', '/squad/', '/storagepile', '/purchased/items'],
  contrib: {
    match: ['/sbs/', '/objective/', '/academy/', 'players.json', 'players_meta', 'itemraritytunables', 'squaddata', '/transfermarket'],
    stripFields: ['tradeId', 'sellerName', 'sellerId', 'buyerName', 'buyerId', 'sellerEstablished'],
  },
  personalMatch: ['/club', '/squad', '/transfermarket', '/tradepile', '/watchlist', '/sbs/', 'objective', 'dynamicobjective', '/milestone', '/scenario',
    '/academy', '/user/credits', '/storagepile', '/purchased/items', 'players.json', 'players_icons', 'players_meta', 'squaddata.json',
    'keyattributes.json', 'chemistry/', 'itemraritytunables'],
}

/** Sunucudan gelen kurallar eksik alan içerirse alan bazında varsayılana düşülür (uzantı da böyle yapar). */
export function mergeRules(remote: Partial<CaptureRules> | undefined | null): CaptureRules {
  const r = remote ?? {}
  return {
    deny: Array.isArray(r.deny) ? r.deny : DEFAULT_CAPTURE_RULES.deny,
    personalOnly: Array.isArray(r.personalOnly) ? r.personalOnly : DEFAULT_CAPTURE_RULES.personalOnly,
    personalMatch: Array.isArray(r.personalMatch) ? r.personalMatch : DEFAULT_CAPTURE_RULES.personalMatch,
    contrib: {
      match: Array.isArray(r.contrib?.match) ? r.contrib.match : DEFAULT_CAPTURE_RULES.contrib.match,
      stripFields: Array.isArray(r.contrib?.stripFields) ? r.contrib.stripFields : DEFAULT_CAPTURE_RULES.contrib.stripFields,
    },
  }
}

export type CaptureMode = 'PERSONAL' | 'CONTRIB'
export interface Capture {
  url: string
  status: number
  ts: number
  body: string
}
export interface HarSkipped {
  total: number
  denied: number
  unmatched: number
  /** status ≠ 200 */
  notOk: number
  notJson: number
  tooLarge: number
}
export interface HarResult {
  captures: Capture[]
  skipped: HarSkipped
}

export const MAX_BODY_BYTES = 5 * 1024 * 1024
export const MAX_FILE_BYTES = 150 * 1024 * 1024

export class HarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HarError'
  }
}

export function assertHarFileSize(bytes: number): void {
  if (bytes > MAX_FILE_BYTES) {
    throw new HarError('Dosya çok büyük (en çok 150 MB). Daha kısa bir oturumla yeniden dışa aktar.')
  }
}

const anyIn = (url: string, list: string[]) => list.some((p) => url.includes(String(p).toLowerCase()))

export function isDenied(url: string, rules: CaptureRules): boolean {
  return anyIn(url.toLowerCase(), rules.deny)
}

/** Kişisel: personalMatch. Katkı: personalOnly hariç ve contrib.match. Deny her zaman önce. */
export function isMatched(url: string, rules: CaptureRules, mode: CaptureMode): boolean {
  const u = url.toLowerCase()
  if (!u || isDenied(u, rules)) {
    return false
  }
  return mode === 'CONTRIB' ? !anyIn(u, rules.personalOnly) && anyIn(u, rules.contrib.match) : anyIn(u, rules.personalMatch)
}

/** Katkı modunda satıcı/alıcı kimliği gibi alanları her derinlikte siler (extension/rules.js stripBody ile aynı). */
export function stripFields(data: unknown, fields: string[]): unknown {
  if (Array.isArray(data)) {
    data.forEach((d) => stripFields(d, fields))
  } else if (data && typeof data === 'object') {
    const node = data as Record<string, unknown>
    fields.forEach((f) => delete node[f])
    Object.values(node).forEach((v) => stripFields(v, fields))
  }
  return data
}

interface Picked {
  url: string
  status: number
  started: string | undefined
  text: string | undefined
  base64: boolean
}

/** Girdiden okunan tek yer: yalnız dört alan (+ içerik kodlaması). Başlık, çerez, postData'ya erişim yok. */
function pick(entry: unknown): Picked {
  const e = (entry ?? {}) as { startedDateTime?: unknown; request?: { url?: unknown }; response?: { status?: unknown; content?: { text?: unknown; encoding?: unknown } } }
  return {
    url: typeof e.request?.url === 'string' ? e.request.url : '',
    status: typeof e.response?.status === 'number' ? e.response.status : 0,
    started: typeof e.startedDateTime === 'string' ? e.startedDateTime : undefined,
    text: typeof e.response?.content?.text === 'string' ? e.response.content.text : undefined,
    base64: e.response?.content?.encoding === 'base64',
  }
}

const utf8 = new TextDecoder('utf-8')
const encoder = new TextEncoder()

function decodeBase64(text: string): string | undefined {
  try {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return utf8.decode(bytes)
  } catch {
    return undefined
  }
}

/** UTF-8 bayt sınırı; uzunluk zaten sınırı aşıyorsa kodlamadan karar verilir (karakter sayısı ≤ bayt sayısı). */
function overLimit(text: string): boolean {
  return text.length > MAX_BODY_BYTES || (text.length * 3 > MAX_BODY_BYTES && encoder.encode(text).length > MAX_BODY_BYTES)
}

export function parseHar(input: string | unknown, { mode, rules }: { mode: CaptureMode; rules: CaptureRules }): HarResult {
  let har: unknown = input
  if (typeof input === 'string') {
    try {
      har = JSON.parse(input)
    } catch {
      throw new HarError('Dosya geçerli bir HAR (JSON) değil.')
    }
  }
  const entries = (har as { log?: { entries?: unknown } })?.log?.entries
  if (!Array.isArray(entries)) {
    throw new HarError('Bu bir HAR dosyası değil: "log.entries" bulunamadı.')
  }
  const skipped: HarSkipped = { total: entries.length, denied: 0, unmatched: 0, notOk: 0, notJson: 0, tooLarge: 0 }
  const captures: Capture[] = []
  for (const entry of entries) {
    const p = pick(entry)
    if (isDenied(p.url, rules)) {
      skipped.denied++
      continue
    }
    if (!isMatched(p.url, rules, mode)) {
      skipped.unmatched++
      continue
    }
    if (p.status !== 200) {
      skipped.notOk++
      continue
    }
    const text = p.text === undefined ? undefined : p.base64 ? decodeBase64(p.text) : p.text
    if (text === undefined) {
      skipped.notJson++
      continue
    }
    if (overLimit(text)) {
      skipped.tooLarge++
      continue
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      skipped.notJson++
      continue
    }
    const body = mode === 'CONTRIB' ? JSON.stringify(stripFields(json, rules.contrib.stripFields)) : text
    const ts = p.started ? Date.parse(p.started) : NaN
    captures.push({ url: p.url, status: 200, ts: Number.isFinite(ts) ? ts : Date.now(), body })
  }
  return { captures, skipped }
}

export interface CaptureSummary {
  sbcSets: number
  sbcChallenges: number
  clubCards: number
  priceObservations: number
  objectives: number
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}
const len = (v: unknown) => (Array.isArray(v) ? v.length : 0)

/** Göndermeden önceki özet: sunucunun yol ayrımıyla aynı (UtCaptureService.kindOf). */
export function summarizeCaptures(captures: Capture[]): CaptureSummary {
  const s: CaptureSummary = { sbcSets: 0, sbcChallenges: 0, clubCards: 0, priceObservations: 0, objectives: 0 }
  for (const c of captures) {
    const path = pathOf(c.url)
    let body: Record<string, unknown>
    try {
      body = JSON.parse(c.body) as Record<string, unknown>
    } catch {
      continue
    }
    if (path.includes('/sbs/hub')) {
      s.sbcSets += (Array.isArray(body.categories) ? body.categories : []).reduce((n: number, cat: { sets?: unknown }) => n + len(cat?.sets), 0)
    } else if (path.includes('/sbs/')) {
      s.sbcChallenges += len(body.challenges)
    } else if (/\/game\/[^/]+\/club$/.test(path)) {
      s.clubCards += len(body.itemData)
    } else if (path.endsWith('/transfermarket')) {
      s.priceObservations += len(body.auctionInfo)
    } else if (path.endsWith('/objective/list')) {
      s.objectives += (Array.isArray(body.objectiveGroups) ? body.objectiveGroups : []).reduce((n: number, g: { objectives?: unknown }) => n + len(g?.objectives), 0)
    }
  }
  return s
}
