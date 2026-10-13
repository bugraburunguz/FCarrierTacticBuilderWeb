import { rulesStore } from '../state/rulesStore'

/**
 * Resmî olmayan ama rehberde adım adım verilen Squad Rating hesabı (FC 27 Squad Rating Guide):
 * ortalamanın üstündeki oyuncuların farkları düzeltme katsayısı olur, toplam + katsayı yuvarlanır, oyuncu sayısına bölünüp aşağı yuvarlanır.
 * Oyun içi değer her zaman esastır; üçüncü taraf hesaplayıcılar küçük sapma gösterebilir.
 * Boyutlar kurallardan gelir: kadro ekranı 18 (XI + 7 yedek), SBC 11 (rulesStore → squadRating.sizes).
 */
export const squadSize = () => rulesStore.get().squadRating.sizes.squad
export const sbcSize = () => rulesStore.get().squadRating.sizes.sbc

/** En iyi `size` oyuncu üzerinden rating (varsayılan: SBC boyutu değil, verilen listenin tamamı). */
export function squadRating(ratings: number[], size: number = ratings.length): number {
  const top = [...ratings].sort((a, b) => b - a).slice(0, size)
  if (top.length === 0) {
    return 0
  }
  const sum = top.reduce((a, b) => a + b, 0)
  const average = sum / top.length
  const correction = top.reduce((acc, r) => acc + Math.max(0, r - average), 0)
  return Math.floor(Math.round(sum + correction) / top.length)
}

/** Kadronun en iyi 18 oyuncusu (11 ilk + 7 yedek) üzerinden rating. */
export function bestSquadRating(overalls: number[]): { rating: number; counted: number } {
  const top = [...overalls].sort((a, b) => b - a).slice(0, squadSize())
  return { rating: squadRating(top), counted: top.length }
}

export function starRating(rating: number): number {
  return rulesStore.get().squadRating.starRating.find((s) => rating >= s.min)?.stars ?? 0
}
