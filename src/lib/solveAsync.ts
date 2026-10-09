import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSlot, type SbcSolution } from './sbcTraditional'

/** Çözücüyü Web Worker'da çalıştırır (ana iş parçacığı donmaz, BUG-03); Worker yoksa (test ortamı) senkron çalışır. */
export function solveTraditionalAsync(slots: SbcSlot[], pool: SbcCandidate[], constraints: SbcConstraints): Promise<SbcSolution> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(solveTraditional(slots, pool, constraints))
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./sbcWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<SbcSolution>) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Çözücü çalışırken hata oluştu.'))
    }
    worker.postMessage({ slots, pool, constraints })
  })
}
