import { assertHarFileSize, HarError, parseImportText, type CaptureMode, type CaptureRules, type HarResult, type ImportFileKind } from './harCapture'
import type { HarWorkerResponse } from './harWorker'

/**
 * İçe aktarma dosyasını (HAR ya da uzantı yakalama dosyası) Web Worker'da okur ve ayrıştırır; Worker yoksa (test ortamı) aynı saf fonksiyon burada çalışır.
 * Boyut sınırı dosya okunmadan kontrol edilir. Ham dosya hiçbir yere gönderilmez.
 */
export async function parseImportFile(file: File, kind: ImportFileKind, mode: CaptureMode, rules: CaptureRules): Promise<HarResult> {
  assertHarFileSize(file.size)
  if (typeof Worker === 'undefined') {
    return parseImportText(await file.text(), kind, mode, rules)
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./harWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<HarWorkerResponse>) => {
      worker.terminate()
      if (event.data.ok) {
        resolve(event.data.result)
      } else {
        reject(new HarError(event.data.message))
      }
    }
    worker.onerror = () => {
      worker.terminate()
      reject(new HarError('Dosya okunamadı.'))
    }
    worker.postMessage({ file, kind, mode, rules })
  })
}

/** HAR-01 adı: HAR dosyası. */
export const parseHarFile = (file: File, mode: CaptureMode, rules: CaptureRules) => parseImportFile(file, 'har', mode, rules)
