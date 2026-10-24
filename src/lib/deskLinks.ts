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
