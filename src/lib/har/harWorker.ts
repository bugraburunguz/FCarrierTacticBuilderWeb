import { HarError, parseImportText, type CaptureMode, type CaptureRules, type HarResult, type ImportFileKind } from './harCapture'

/** Dosya okuma + ayrıştırma ana iş parçacığının dışında (yüzlerce MB JSON.parse arayüzü dondurmasın). kind: HAR ya da uzantı yakalama dosyası. */
export type HarWorkerRequest = { file: Blob; kind: ImportFileKind; mode: CaptureMode; rules: CaptureRules }
export type HarWorkerResponse = { ok: true; result: HarResult } | { ok: false; message: string }

self.onmessage = async (event: MessageEvent<HarWorkerRequest>) => {
  const { file, kind, mode, rules } = event.data
  try {
    self.postMessage({ ok: true, result: parseImportText(await file.text(), kind, mode, rules) } satisfies HarWorkerResponse)
  } catch (e) {
    self.postMessage({ ok: false, message: e instanceof HarError ? e.message : 'Dosya okunamadı.' } satisfies HarWorkerResponse)
  }
}
