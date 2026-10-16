import type { KbEvolution } from '../../../api/types'
import type { UtCard } from '../../../lib/utCard'

export type EvoEligibility = { kind: 'count'; count: number; cards: UtCard[] } | { kind: 'unknown'; reason: string }

/**
 * "Kulübünde uygun N oyuncu" (V3-07c). Sayım yalnız doğrulanmış bir gereksinim biçimiyle yapılır; tahmin uydurulmaz.
 * Bugün KB'deki 39 evolution'ın hiçbirinde gereksinim yok (yakalamadan KB'ye yalnız ad, seviye sayısı ve şart sayısı aktarılıyor). Yakalamadaki
 * EA biçimi (`elgReqs`: PLAYER_ATTRIBUTE / SCOPE / ACADEMY_PLAYER_SLOTTING, sayısal anahtar ve değerler) belgesiz ve doğrulanmadı; çözülmez.
 * Doğrulanmış bir biçim gelince sayım burada, tek yerde eklenir.
 */
export function evoEligibility(evo: KbEvolution, _cards: Pick<UtCard, 'rating' | 'positions'>[]): EvoEligibility {
  const requirements = evo.requirements
  if (!requirements || Object.keys(requirements).length === 0) {
    return { kind: 'unknown', reason: 'gereksinim verisi yok' }
  }
  return { kind: 'unknown', reason: 'gereksinim biçimi doğrulanmadı' }
}
