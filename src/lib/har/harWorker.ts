import { HarError, parseHar, type CaptureMode, type CaptureRules, type HarResult } from './harCapture'

/** HAR okuma + ayrıştırma ana iş parçacığının dışında (yüzlerce MB JSON.parse arayüzü dondurmasın). */
export type HarWorkerRequest = { file: Blob; mode: CaptureMode; rules: CaptureRules }
export type HarWorkerResponse = { ok: true; result: HarResult } | { ok: false; message: string }

self.onmessage = async (event: MessageEvent<HarWorkerRequest>) => {
  const { file, mode, rules } = event.data
  try {
    const result = parseHar(await file.text(), { mode, rules })
    self.postMessage({ ok: true, result } satisfies HarWorkerResponse)
  } catch (e) {
    self.postMessage({ ok: false, message: e instanceof HarError ? e.message : 'Dosya okunamadı.' } satisfies HarWorkerResponse)
  }
}
