import type { LeLogTrimResponse } from './leLogTrimWorker'

const MARK = 'FCX2\t'
const META = `${MARK}META\t`
const REQUIRED = ['players', 'teams', 'teamplayerlinks']

export type ByteRange = { start: number; end: number }

type Block = { start: number; end: number; career: boolean; complete: boolean }

function readContext(text: string, metaAt: number): Record<string, unknown> | null {
  const from = metaAt + META.length
  const lineEnd = text.indexOf('\n', from)
  const raw = text.slice(from, lineEnd < 0 ? text.length : lineEnd).split('\t')[0].trim()
  try {
    const meta = JSON.parse(raw) as { context?: Record<string, unknown> }
    return meta.context ?? {}
  } catch {
    return null
  }
}

function isCareer(context: Record<string, unknown>): boolean {
  if (typeof context.inCareer === 'boolean') {
    return context.inCareer
  }
  return context.mode !== 'BASE' && context.gameDate != null
}

function hasLine(text: string, needle: string, start: number, end: number): boolean {
  const at = text.indexOf(needle, start)
  return at >= 0 && at < end
}

function isComplete(text: string, start: number, end: number): boolean {
  return REQUIRED.every((table) => hasLine(text, `${MARK}END\t${table}\t`, start, end) && !hasLine(text, `${MARK}ERROR\t${table}\t`, start, end))
}

function listBlocks(text: string): (Block | null)[] {
  const metas: number[] = []
  for (let at = text.indexOf(META); at >= 0; at = text.indexOf(META, at + META.length)) {
    metas.push(at)
  }
  const starts = metas.map((at) => text.lastIndexOf('\n', at) + 1)
  return metas.map((at, i) => {
    const context = readContext(text, at)
    if (!context) {
      return null
    }
    const start = starts[i]
    const end = i + 1 < starts.length ? starts[i + 1] : text.length
    return { start, end, career: isCareer(context), complete: isComplete(text, start, end) }
  })
}

export type ExportKind = 'career' | 'base'
export type ExportPick = { range: ByteRange | null; missing: boolean }

export const NO_BASE_EXPORT = "Logda ana menü (BASE) export'u yok"

/**
 * Sunucunun seçeceği export'un bayt aralığı (LeExportV2Parser, Prefer.CAREER / Prefer.BASE): istenen türün en son tam export'u, tamı yoksa
 * en son export'u. text Latin-1 çözülmüş olmalı (her karakter bir bayt). Kırpmaya gerek yoksa ya da emin olunamıyorsa range null.
 * missing: bütün META'lar okundu ve istenen türde export yok.
 */
export function pickExport(text: string, kind: ExportKind): ExportPick {
  const blocks = listBlocks(text)
  const readable = blocks.every((b) => b !== null)
  const matching = (blocks.filter((b) => b !== null) as Block[]).filter((b) => b.career === (kind === 'career'))
  const missing = readable && matching.length === 0
  if (blocks.length < 2 || !readable) {
    return { range: null, missing }
  }
  const chosen = [...matching].reverse().find((b) => b.complete) ?? matching.at(-1)
  return { range: chosen ? { start: chosen.start, end: chosen.end } : null, missing }
}

export function findCareerExportRange(text: string): ByteRange | null {
  return pickExport(text, 'career').range
}

export function findBaseExportRange(text: string): ByteRange | null {
  return pickExport(text, 'base').range
}

export function pickExportInBytes(bytes: ArrayBuffer, kind: ExportKind): ExportPick {
  return pickExport(new TextDecoder('latin1').decode(bytes), kind)
}

function pickInWorker(file: File, kind: ExportKind): Promise<ExportPick> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./leLogTrimWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<LeLogTrimResponse>) => {
      worker.terminate()
      resolve(event.data.pick)
    }
    worker.onerror = () => {
      worker.terminate()
      resolve({ range: null, missing: false })
    }
    worker.postMessage({ file, kind })
  })
}

async function trimLog(file: File, kind: ExportKind): Promise<File> {
  const { range, missing } = typeof Worker === 'undefined' ? pickExportInBytes(await file.arrayBuffer(), kind) : await pickInWorker(file, kind)
  if (kind === 'base' && missing) {
    throw new Error(NO_BASE_EXPORT)
  }
  if (!range || (range.start === 0 && range.end === file.size)) {
    return file
  }
  return new File([file.slice(range.start, range.end)], file.name, { type: file.type })
}

/**
 * FCA-18: betik 2.0.5 her ay başında aynı loga yeni bir tam export ekler; log yükleme sınırını aşar. Sunucu zaten yalnız bir export'u içe
 * aktardığı için yalnız o export'un ham baytları gönderilir. Ham bayt korunur (sunucu FNV özetini ham bayt üzerinden doğrular).
 */
export function trimCareerLog(file: File): Promise<File> {
  return trimLog(file, 'career')
}

/** FCA-32: genel kadro yüklemesinde yalnız son ana menü (BASE) export'u gider; logda BASE export'u yoksa NO_BASE_EXPORT hatası. */
export function trimBaseLog(file: File): Promise<File> {
  return trimLog(file, 'base')
}

export async function gzipFile(file: File): Promise<File> {
  if (typeof CompressionStream === 'undefined') {
    return file
  }
  const compression = new CompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>
  const writer = compression.writable.getWriter()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const writing = writer.write(bytes).then(() => writer.close())
  const reader = compression.readable.getReader()
  const parts: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    parts.push(value)
  }
  await writing
  return new File(parts as BlobPart[], `${file.name}.gz`, { type: 'application/gzip' })
}

export async function prepareCareerLog(file: File): Promise<File> {
  return gzipFile(await trimCareerLog(file))
}
