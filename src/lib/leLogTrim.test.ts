import { afterEach, describe, expect, it, vi } from 'vitest'
import { findCareerExportRange, prepareCareerLog, trimCareerLog } from './leLogTrim'

const REQUIRED = ['players', 'teams', 'teamplayerlinks']

function line(kind: string, ...fields: string[]): string {
  return ['07:12:41.485375', 'INFO', '[LUA API] FCX2', kind, ...fields].join('\t') + '\n'
}

function exportBlock(opts: { inCareer?: boolean; mode?: string; gameDate?: string; seq: number; tables?: string[]; error?: string; done?: boolean }): string {
  const context: Record<string, unknown> = { mode: opts.mode ?? 'CAREER', exportSeq: opts.seq }
  if (opts.inCareer !== undefined) {
    context.inCareer = opts.inCareer
  }
  if (opts.gameDate) {
    context.gameDate = opts.gameDate
  }
  let out = line('META', JSON.stringify({ schema: 'fccareer.le-export', schemaVersion: 2, context }))
  out += 'INFO\tsome other live editor line\n'
  for (const table of opts.tables ?? REQUIRED) {
    out += line('HEADER', table, '["playerid"]')
    out += line('CHUNK', table, '1', `[["${opts.seq}"]]`)
    if (opts.error === table) {
      out += line('ERROR', table, 'boom')
    } else {
      out += line('END', table, '1', 'fnv1a32:00000000', '1')
    }
  }
  if (opts.done !== false) {
    out += line('DONE', '[]')
  }
  return out
}

describe('findCareerExportRange (FCA-18)', () => {
  it('birden çok aylık export varsa yalnız sonuncusunu seçer', () => {
    const head = 'INFO\tLE started\n'
    const first = exportBlock({ inCareer: true, seq: 1 })
    const second = exportBlock({ inCareer: true, seq: 2 })
    const third = exportBlock({ inCareer: true, seq: 3 })
    const text = head + first + second + third
    expect(findCareerExportRange(text)).toEqual({ start: head.length + first.length + second.length, end: text.length })
  })

  it('son export yarım kaldıysa (zorunlu tablo bitmemiş) ondan önceki tam export seçilir', () => {
    const first = exportBlock({ inCareer: true, seq: 1 })
    const second = exportBlock({ inCareer: true, seq: 2, tables: ['players'], done: false })
    expect(findCareerExportRange(first + second)).toEqual({ start: 0, end: first.length })
  })

  it('zorunlu tabloda ERROR olan export tam sayılmaz', () => {
    const first = exportBlock({ inCareer: true, seq: 1 })
    const second = exportBlock({ inCareer: true, seq: 2, error: 'teams' })
    expect(findCareerExportRange(first + second)).toEqual({ start: 0, end: first.length })
  })

  it('ana menü (BASE) export kariyer export\'undan sonra gelse de kariyer export\'u seçilir', () => {
    const career = exportBlock({ inCareer: true, seq: 1 })
    const base = exportBlock({ inCareer: false, mode: 'BASE', seq: 2 })
    expect(findCareerExportRange(career + base)).toEqual({ start: 0, end: career.length })
  })

  it('inCareer yazmayan eski betikte oyun tarihi olan export kariyer sayılır', () => {
    const base = exportBlock({ mode: 'BASE', seq: 1 })
    const career = exportBlock({ mode: 'UNKNOWN', gameDate: '2026-08-01', seq: 2 })
    const tail = exportBlock({ mode: 'BASE', seq: 3 })
    expect(findCareerExportRange(base + career + tail)).toEqual({ start: base.length, end: base.length + career.length })
  })

  it('tek export, export yok ya da kariyer export\'u yoksa kırpmaz (null)', () => {
    expect(findCareerExportRange(exportBlock({ inCareer: true, seq: 1 }))).toBeNull()
    expect(findCareerExportRange('INFO\tnothing here\n')).toBeNull()
    expect(findCareerExportRange(exportBlock({ inCareer: false, mode: 'BASE', seq: 1 }) + exportBlock({ inCareer: false, mode: 'BASE', seq: 2 }))).toBeNull()
  })

  it('bozuk META JSON\'u olan export atlanır, sunucunun hatası için dosya olduğu gibi kalır', () => {
    const broken = line('META', '{not json') + line('DONE', '[]')
    expect(findCareerExportRange(broken + broken)).toBeNull()
  })
})

describe('trimCareerLog (FCA-18)', () => {
  it('seçilen aralığı ham baytlarıyla aynı adla döndürür (UTF-8 dışı bayt bozulmaz)', async () => {
    const first = new TextEncoder().encode(exportBlock({ inCareer: true, seq: 1 }))
    const lastText = exportBlock({ inCareer: true, seq: 2 })
    const cut = lastText.indexOf('some other')
    const raw = new Uint8Array([...new TextEncoder().encode(lastText.slice(0, cut)), 0xff, 0x9d, 0x81])
    const last = new Uint8Array([...raw, ...new TextEncoder().encode(lastText.slice(cut))])
    const file = new File([first, last], 'live_editor.log')
    const trimmed = await trimCareerLog(file)
    expect(trimmed.name).toBe('live_editor.log')
    expect(new Uint8Array(await trimmed.arrayBuffer())).toEqual(last)
  })

  it('kırpılacak bir şey yoksa aynı dosyayı döndürür', async () => {
    const file = new File([exportBlock({ inCareer: true, seq: 1 })], 'a.log')
    expect(await trimCareerLog(file)).toBe(file)
  })
})

async function gunzip(file: File): Promise<Uint8Array> {
  const { gunzipSync } = await import('node:zlib')
  return new Uint8Array(gunzipSync(new Uint8Array(await file.arrayBuffer())))
}

describe('prepareCareerLog (FCA-21)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('son export\'u kırpar ve gzip\'ler; açılınca ham baytlar aynıdır', async () => {
    const { CompressionStream } = await import('node:stream/web')
    vi.stubGlobal('CompressionStream', CompressionStream)
    const lastText = exportBlock({ inCareer: true, seq: 2 })
    const raw = new Uint8Array([...new TextEncoder().encode(lastText), 0xff, 0x9d, 0x81])
    const file = new File([exportBlock({ inCareer: true, seq: 1 }), raw], 'aylik.log')
    const sent = await prepareCareerLog(file)
    expect(sent.name).toBe('aylik.log.gz')
    expect(sent.type).toBe('application/gzip')
    const bytes = new Uint8Array(await sent.arrayBuffer())
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b])
    expect(await gunzip(sent)).toEqual(raw)
  })

  it('tarayıcıda CompressionStream yoksa kırpılmış dosyayı sıkıştırmadan gönderir', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const file = new File([exportBlock({ inCareer: true, seq: 1 })], 'a.log')
    expect(await prepareCareerLog(file)).toBe(file)
  })
})
