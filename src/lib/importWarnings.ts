import type { ImportSummary } from '../api/types'

/** Sunucunun uyarı kodlarını kullanıcıya gösterilecek kısa Türkçe metne çevirir (LE-02). */
export function importWarningText(code: string, summary: Pick<ImportSummary, 'skippedNoPosition'>): string {
  switch (code) {
    case 'CAREER_PLAYERS_SKIPPED_NO_POSITIONS':
      return `${summary.skippedNoPosition ?? 0} kariyer-üretimi oyuncu atlandı: players.csv'de pozisyon/özellik kolonu yok. Tam export script'iyle yeniden dışa aktar.`
    case 'NOT_IN_CAREER':
      return 'Kariyer algılanmadı: dosya ana menüde alınmış görünüyor, bu kadrolar kariyer verisi değil. Kariyerin içindeyken yeniden dışa aktar.'
    default:
      return code
  }
}
