import type { UtCard } from '../lib/utCard'
import { bigStore } from './bigStore'

const NAME = 'utCards'

export interface UtCardLibrary {
  cards: UtCard[]
  importedAt: string
}

export const utCardStore = {
  get: (): UtCardLibrary | undefined => bigStore.get<UtCardLibrary>(NAME),
  /** Kulüp ve gördüğün market kartlarını saklar (IndexedDB; kart sayısı sınırlanmaz). Yazım hatası depolama uyarısı olarak görünür. */
  set(cards: UtCard[]): boolean {
    bigStore.set(NAME, { cards, importedAt: new Date().toISOString() } satisfies UtCardLibrary)
    return true
  },
  clear() {
    bigStore.clear(NAME)
  },
}
