import type { PositionGroup } from './deskRules'

const query = (path: string, params: Record<string, string | number>) => `${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`

/** Masa geçişleri (KARIYER-UX 15 §4.1): hedef sayfaların kalıcı rota ve parametreleri. deskRules ve Masa yalnız bunları üretir. */
export const deskLink = {
  candidate: (slotId: string, position: string, roleId: string) => query('/career/transfer', { ihtiyac: `slot-${slotId}`, pos: position, rol: roleId }),
  lab: (slotId?: string) => (slotId ? query('/career/tactics-lab', { sekme: 'kurucu', slot: slotId }) : '/career/tactics-lab'),
  contract: (playerId: number) => query(`/players/${playerId}`, { sekme: 'sozlesme' }),
  loans: () => query('/career/squad', { sekme: 'hareketler' }),
  sell: (playerId: number) => query('/career/transfer', { sekme: 'satis', oyuncu: playerId }),
  depth: (group: PositionGroup) => query('/career/squad', { sekme: 'derinlik', grup: group }),
  growth: (playerId: number) => query('/career/growth', { oyuncu: playerId }),
  settings: () => query('/career/dashboard', { sekme: 'ayarlar' }),
}

/**
 * GEÇİCİ eşleme — FAZ 4-5 (Lab, Transfer parametreleri) gelince kaldırılacak. Kadro eşlemesi FAZ 3'te kalktı (/career/squad gerçek sayfa, `grup` okunur).
 * Yeni sayfalar yokken §4.1 bağlantısını bugünkü sayfanın okuduğu rota ve parametreye çevirir; okunmayan parametre zarar vermediği için kalır.
 * Bugün karşılanmayanlar: Transfer `sekme`, `oyuncu`; Lab `sekme`, `slot` (kurucu slot seçmez).
 */
export function currentRoute(to: string): string {
  const [path, search = ''] = to.split('?')
  const params = new URLSearchParams(search)
  if (path === '/career/transfer' && params.has('rol')) {
    params.set('role', params.get('rol')!)
    return `${path}?${params}`
  }
  if (path === '/career/tactics-lab') {
    params.delete('sekme')
    return params.size ? `/squad/builder?${params}` : '/squad/builder'
  }
  return to
}
