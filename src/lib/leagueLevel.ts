/**
 * V3-06c "Lig seviyesi" göstergesi (rol uyumu değil): oyuncu OVR'ı ile kariyerdeki ligin gücü (lig OVR'ı, sunucu `facets.leagueOvr`) karşılaştırılır.
 * Eşik yalnız burada; lig gücü bilinmiyorsa gösterge yok.
 */
export const LEAGUE_LEVEL_BAND = 2
export const LEAGUE_LEVEL_HELP = "Oyuncunun OVR'ı, kariyerindeki ligin ortalama seviyesiyle karşılaştırılır."

export interface LeagueLevel {
  kind: 'above' | 'at' | 'below'
  diff: number
  text: string
}

export function leagueLevel(overall: number, leagueOvr: number | undefined): LeagueLevel | undefined {
  if (leagueOvr === undefined) {
    return undefined
  }
  const diff = overall - leagueOvr
  if (Math.abs(diff) <= LEAGUE_LEVEL_BAND) {
    return { kind: 'at', diff, text: 'Lig seviyesinde' }
  }
  return diff > 0 ? { kind: 'above', diff, text: `Ligin üstünde (+${diff})` } : { kind: 'below', diff, text: `Ligin altında (−${-diff})` }
}
