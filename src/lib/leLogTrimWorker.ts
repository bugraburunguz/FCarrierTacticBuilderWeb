import { findCareerExportRangeInBytes, type ByteRange } from './leLogTrim'

export type LeLogTrimRequest = { file: Blob }
export type LeLogTrimResponse = { range: ByteRange | null }

self.onmessage = async (event: MessageEvent<LeLogTrimRequest>) => {
  try {
    self.postMessage({ range: findCareerExportRangeInBytes(await event.data.file.arrayBuffer()) } satisfies LeLogTrimResponse)
  } catch {
    self.postMessage({ range: null } satisfies LeLogTrimResponse)
  }
}
