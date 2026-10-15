import { assertHarFileSize, HarError, parseHar, type CaptureMode, type CaptureRules, type HarResult } from './harCapture'
import type { HarWorkerResponse } from './harWorker'

/**
 * HAR dosyasını Web Worker'da okur ve ayrıştırır; Worker yoksa (test ortamı) aynı saf fonksiyon burada çalışır.
 * Boyut sınırı dosya okunmadan kontrol edilir. Ham dosya hiçbir yere gönderilmez.
 */
export async function parseHarFile(file: File, mode: CaptureMode, rules: CaptureRules): Promise<HarResult> {
  assertHarFileSize(file.size)
  if (typeof Worker === 'undefined') {
    return parseHar(await file.text(), { mode, rules })
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
    worker.postMessage({ file, mode, rules })
  })
}
