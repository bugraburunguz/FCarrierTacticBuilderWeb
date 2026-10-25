import type { ImportSummary } from '../api/types'

/** FAZ 6a-A: bu kodlardan biri gelirse içe aktarma ekranı "kariyer içinden export" rehberini gösterir. */
export const CAREER_EXPORT_GUIDE_CODES = ['NOT_IN_CAREER', 'CONTRACTS_MISSING']

/** Sunucunun uyarı kodlarını kullanıcıya gösterilecek kısa Türkçe metne çevirir (LE-02). */
export function importWarningText(code: string, summary: Pick<ImportSummary, 'skippedNoPosition'>): string {
  switch (code) {
    case 'CAREER_PLAYERS_SKIPPED_NO_POSITIONS':
      return `${summary.skippedNoPosition ?? 0} kariyer-üretimi oyuncu atlandı: players.csv'de pozisyon/özellik kolonu yok. Tam export script'iyle yeniden dışa aktar.`
    case 'NOT_IN_CAREER':
      return 'Bu export ana menüden; maaş, sözleşme ve oyun tarihi gelmez. Kariyer içinden export al.'
    case 'CONTRACTS_MISSING':
      return "Bu export'ta maaş ve sözleşme yok: Masa'daki finans, sözleşme uyarıları ve zaman çizelgesi boş kalır. Güncel script'i indirip kariyerin içinden yeniden export al."
    default:
      return code
  }
}
