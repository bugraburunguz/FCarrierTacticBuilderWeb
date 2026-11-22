import { pickExportInBytes, type ExportKind, type ExportPick } from './leLogTrim'

export type LeLogTrimRequest = { file: Blob; kind: ExportKind }
export type LeLogTrimResponse = { pick: ExportPick }

self.onmessage = async (event: MessageEvent<LeLogTrimRequest>) => {
  try {
    self.postMessage({ pick: pickExportInBytes(await event.data.file.arrayBuffer(), event.data.kind) } satisfies LeLogTrimResponse)
  } catch {
    self.postMessage({ pick: { range: null, missing: false } } satisfies LeLogTrimResponse)
  }
}
