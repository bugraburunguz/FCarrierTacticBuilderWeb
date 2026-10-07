export type FormationStyle = 'used' | 'attacking' | 'defensive' | 'counter' | 'possession' | 'crossing' | 'balanced'

export const STYLE_LABELS: Record<FormationStyle, string> = {
  used: 'Çok kullanılan',
  attacking: 'Hücumcu',
  defensive: 'Savunmacı',
  counter: 'Kontra',
  possession: 'Top tutma',
  crossing: 'Orta',
  balanced: 'Dengeli',
}

/**
 * "The Best FC 27 Formation" rehberindeki listelerin formasyon kimliklerimize eşlemesi (rehber önerisi, ölçüm değil).
 * 4-3-3 varyantları EA adlarına göre: (3 CM) = 4-3-3, (1 CDM + 2 CM) = 4-3-3 (2), (2 CDM + CM) = 4-3-3 (3), (2 CM + CAM) = 4-3-3 (4).
 * 4-5-1 (2) üç CM'li, 4-5-1 iki CAM'li dizilimdir.
 */
export const FORMATION_STYLES: Record<string, FormationStyle[]> = {
  '4-1-2-1-2': ['used', 'possession', 'balanced'],
  '4-3-2-1': ['used'],
  '4-2-3-1': ['used'],
  '4-2-3-1 (2)': ['used'],
  '4-3-3 (3 CM)': ['used', 'crossing', 'balanced'],
  '4-3-3': ['counter'],
  '4-3-3 (2 CDM)': ['defensive'],
  '4-3-3 (CAM)': ['attacking'],
  '4-2-1-3': ['used', 'defensive', 'possession'],
  '3-4-1-2': ['attacking', 'crossing'],
  '3-4-2-1': ['attacking'],
  '3-4-3': ['attacking', 'crossing'],
  '3-1-4-2': ['attacking'],
  '3-5-2': ['balanced'],
  '5-4-1': ['defensive'],
  '5-2-1-2': ['defensive', 'counter'],
  '5-3-2': ['defensive', 'balanced'],
  '5-2-3': ['counter'],
  '4-2-4': ['counter'],
  '4-4-2': ['crossing', 'balanced'],
  '4-4-2 (2 CDM)': ['counter', 'crossing'],
  '4-5-1': ['possession'],
  '4-5-1 (CAM)': ['possession'],
  '4-4-1-1': ['possession'],
}

export function stylesOf(formationId: string): FormationStyle[] {
  return FORMATION_STYLES[formationId] ?? []
}
