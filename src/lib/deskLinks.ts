import type { PositionGroup } from './deskRules'

const query = (path: string, params: Record<string, string | number>) => `${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`

/** Masa geçişleri (KARIYER-UX 15 §4.1): hedef sayfaların kalıcı rota ve parametreleri. deskRules ve Masa yalnız bunları üretir. */
export const deskLink = {
  candidate: (slotId: string, position: string, roleId: string) => query('/career/transfer', { ihtiyac: `slot-${slotId}`, pos: position, rol: roleId }),
  /** roleId (FIT-2 madde 6): önerilen rol o slota uygulanmış yeni taslak. */
  lab: (slotId?: string, roleId?: string) => (slotId ? query('/career/tactics-lab', { sekme: 'kurucu', slot: slotId, ...(roleId ? { rol: roleId } : {}) }) : '/career/tactics-lab'),
  contract: (playerId: number) => query(`/players/${playerId}`, { sekme: 'sozlesme' }),
  loans: () => query('/career/squad', { sekme: 'hareketler' }),
  sell: (playerId: number) => query('/career/transfer', { sekme: 'satis', oyuncu: playerId }),
  depth: (group: PositionGroup) => query('/career/squad', { sekme: 'derinlik', grup: group }),
  /** Masa'nın slot bazlı derinlik işi: Derinlik'te o slot satırı. */
  depthSlot: (slotId: string) => query('/career/squad', { sekme: 'derinlik', slot: slotId }),
  growth: (playerId: number) => query('/career/growth', { oyuncu: playerId }),
  /** ACADEMY-b: Altyapı'da oyuncunun paneli (mobilde oyuncu sayfası). */
  academy: (playerId: number) => query('/career/academy', { oyuncu: playerId }),
  settings: () => query('/career/dashboard', { sekme: 'ayarlar' }),
}
