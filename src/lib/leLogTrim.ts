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

/**
 * Sunucunun kariyer içe aktarmada seçeceği export'un bayt aralığı (LeExportV2Parser, Prefer.CAREER): en son tam kariyer export'u, tamı yoksa
 * en son kariyer export'u. text Latin-1 çözülmüş olmalı (her karakter bir bayt). Kırpmaya gerek yoksa ya da emin olunamıyorsa null.
 */
export function findCareerExportRange(text: string): ByteRange | null {
  const blocks = listBlocks(text)
  if (blocks.length < 2 || blocks.some((b) => b === null)) {
    return null
  }
  const career = (blocks as Block[]).filter((b) => b.career)
  const chosen = [...career].reverse().find((b) => b.complete) ?? career.at(-1)
  return chosen ? { start: chosen.start, end: chosen.end } : null
}

export function findCareerExportRangeInBytes(bytes: ArrayBuffer): ByteRange | null {
  return findCareerExportRange(new TextDecoder('latin1').decode(bytes))
}

function findRangeInWorker(file: File): Promise<ByteRange | null> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./leLogTrimWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<LeLogTrimResponse>) => {
      worker.terminate()
      resolve(event.data.range)
    }
    worker.onerror = () => {
      worker.terminate()
      resolve(null)
    }
    worker.postMessage({ file })
  })
}

/**
 * FCA-18: betik 2.0.5 her ay başında aynı loga yeni bir tam export ekler; log yükleme sınırını aşar. Sunucu zaten yalnız bir export'u içe
 * aktardığı için yalnız o export'un ham baytları gönderilir. Ham bayt korunur (sunucu FNV özetini ham bayt üzerinden doğrular).
 */
export async function trimCareerLog(file: File): Promise<File> {
  const range = typeof Worker === 'undefined' ? findCareerExportRangeInBytes(await file.arrayBuffer()) : await findRangeInWorker(file)
  if (!range || (range.start === 0 && range.end === file.size)) {
    return file
  }
  return new File([file.slice(range.start, range.end)], file.name, { type: file.type })
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
