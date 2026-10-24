import type { ImportSummary } from '../../api/types'

/** Kariyer içe aktarma (V3-07a) saf yardımcıları: dosya boyutu ve tablo bazlı doğrulama satırları (sunucu özetinden; davranış aynı). */

const KB = 1024
const MB = KB * 1024

/** "820 KB", "1,5 MB", "42 MB": tr-TR ondalık, en çok bir hane (önceki ekran MB'yi aşağı yuvarlayıp 0 MB gösteriyordu). */
export function formatBytes(bytes: number): string {
  if (bytes < KB) {
    return `${bytes} B`
  }
  const [value, unit] = bytes < MB ? [bytes / KB, 'KB'] : [bytes / MB, 'MB']
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${unit}`
}

export interface ImportCheck {
  label: string
  value: string
  ok: boolean
}

const count = (n: number) => n.toLocaleString('tr-TR')

/** Doğrulama tablosu: players / teams (tablo adı, sayı), kariyer bağlamı (NOT_IN_CAREER uyarısı), kadro kurulumu. */
export function importChecks(summary: ImportSummary): ImportCheck[] {
  const notInCareer = (summary.warnings ?? []).includes('NOT_IN_CAREER')
  // FAZ 6a-A: oyun tarihi ve maaş/sözleşme yalnız sunucu bildiriyorsa (eski sunucu contracts göndermez; satır uydurulmaz).
  const careerData: ImportCheck[] = summary.contracts === undefined ? [] : [
    { label: 'Oyun tarihi', value: summary.gameDate ? summary.gameDate.slice(0, 10).split('-').reverse().join('.') : 'yok', ok: Boolean(summary.gameDate) },
    { label: 'Maaş / sözleşme', value: summary.contracts > 0 ? `${count(summary.contracts)} oyuncu` : 'yok', ok: summary.contracts > 0 },
  ]
  return [
    { label: 'players', value: count(summary.players), ok: summary.players > 0 },
    { label: 'teams', value: count(summary.teams), ok: summary.teams > 0 },
    { label: 'Kariyer', value: notInCareer ? 'kariyer algılanmadı' : 'kariyer verisi', ok: !notInCareer },
    ...careerData,
    summary.squadSynced !== undefined
      ? { label: 'Kadro', value: `${summary.guessedTeamName ?? 'Takım'} · ${summary.squadSynced} oyuncu`, ok: summary.squadSynced > 0 }
      : { label: 'Kadro', value: 'takım seçilmedi', ok: false },
  ]
}
