import type { AcademyPlayer, CareerPlayer } from '../api/types'
import type { WeakClass } from './fitLabels'

/** Derinlikte "Genç" kolonu ve yaş bandı sınırı. Kural Kadro › Derinlik ile Masa'nın derinlik işinde ortak (GT-b). */
export const YOUTH_MAX_AGE = 21

/** Matris satırı: ana taktiğin (yoksa başlangıç önerisinin) slotu ve dizilen oyuncu; weakClass /fit/lineup sınıfı (kalite açığı). */
export interface DepthSlot {
  slotId: string
  position: string
  roleId: string
  playerId?: number
  weakClass?: WeakClass
}

export interface DepthCell {
  id: number
  name: string
  /** Altyapı oyuncusunda bilinmeyebilir. */
  overall?: number
  age?: number
  /** Altyapı oyuncusu (Genç kolonunda). */
  academy?: boolean
}

/** Aciliyet (satır başına tek, öncelik sırasıyla): yedek yok > yalnız genç yedek > ilk 11 ≥ 30 yaş > ilk 11 kalite açığı. */
export type SlotUrgency = 'NO_BACKUP' | 'YOUTH_ONLY' | 'OLD_STARTER' | 'QUALITY_GAP'

export const SLOT_URGENCY_LABEL: Record<SlotUrgency, string> = {
  NO_BACKUP: 'Yedek yok',
  YOUTH_ONLY: 'Yalnız genç yedek',
  OLD_STARTER: 'İlk 11 ≥ 30 yaş',
  QUALITY_GAP: 'İlk 11 kalite açığı',
}

export interface SlotDepthRow extends DepthSlot {
  starter?: DepthCell
  backup?: DepthCell
  youth?: DepthCell
  urgency?: SlotUrgency
  /** Altyapıda bu mevkide oynayan en yüksek OVR'li oyuncu ("Altyapıda: {ad}"). */
  academyName?: string
  /** Yedek kaç slotta yedek sayılıyor (farklı mevkili slotlar aynı oyuncuyu paylaşabilir; ≥ 2 ise hücrede not). */
  backupSlots?: number
}

const OLD_STARTER_AGE = 30
const QUALITY_GAP: ReadonlySet<WeakClass> = new Set(['KALITE_ACIGI', 'IKISI'])

const cell = (c: CareerPlayer): DepthCell => ({ id: c.player.id, name: c.player.name, overall: c.player.overall, age: c.player.age })
const academyCell = (p: AcademyPlayer): DepthCell => ({ id: p.playerId, name: p.name, overall: p.overall || undefined, age: p.age ?? undefined, academy: true })
const ovr = (c: DepthCell) => c.overall ?? 0
const young = (age?: number | null) => age !== undefined && age !== null && age <= YOUTH_MAX_AGE

/**
 * GT-b: slot bazlı derinlik. Yedek: ilk 11 dışı, kiralık gönderilmemiş, 21 yaş üstü ve mevkiyi listeleyen en yüksek OVR'li oyuncu; Genç: ilk 11 dışı
 * ≤ 21 yaş kadro oyuncusu ya da altyapı oyuncusu. Aynı mevkideki slotlar sırayla farklı oyuncu alır (iki CB slotu → 1. ve 2. yedek).
 */
export function slotDepth(slots: DepthSlot[], squad: CareerPlayer[], academy: AcademyPlayer[]): SlotDepthRow[] {
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  const starters = new Set(slots.flatMap((s) => (s.playerId !== undefined ? [s.playerId] : [])))
  const bench = squad.filter((c) => !starters.has(c.player.id) && !c.loanedOut).sort((a, b) => b.player.overall - a.player.overall)
  const seen = new Map<string, number>()
  const rows = slots.map((s): SlotDepthRow => {
    const index = seen.get(s.position) ?? 0
    seen.set(s.position, index + 1)
    const plays = (c: CareerPlayer) => c.player.positions.includes(s.position)
    const backups = bench.filter((c) => plays(c) && !young(c.player.age)).map(cell)
    const academyAt = academy.filter((p) => p.positions.includes(s.position)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
    const youth = [...bench.filter((c) => plays(c) && young(c.player.age)).map(cell), ...academyAt.map(academyCell)].sort((a, b) => ovr(b) - ovr(a))
    const starterEntry = s.playerId !== undefined ? byId.get(s.playerId) : undefined
    const starter = starterEntry ? cell(starterEntry) : undefined
    // Yedek gibi genç de aynı mevkideki slotlar arasında paylaşılmaz (tek genç iki slotun uyarısını birden gizlemesin).
    const backup = backups[index]
    const youngest = youth[index]
    const urgency: SlotUrgency | undefined = !backup && !youngest ? 'NO_BACKUP'
      : !backup ? 'YOUTH_ONLY'
        : starter?.age !== undefined && starter.age >= OLD_STARTER_AGE ? 'OLD_STARTER'
          : s.weakClass && QUALITY_GAP.has(s.weakClass) ? 'QUALITY_GAP' : undefined
    return { ...s, starter, backup, youth: youngest, urgency, academyName: academyAt[0]?.name }
  })
  const backupCount = new Map<number, number>()
  rows.forEach((r) => r.backup && backupCount.set(r.backup.id, (backupCount.get(r.backup.id) ?? 0) + 1))
  return rows.map((r) => (r.backup ? { ...r, backupSlots: backupCount.get(r.backup.id) } : r))
}

/**
 * Matris satırları her zaman formasyonun slotlarından (11): dizilmemiş ya da oyuncusu kadrodan çıkmış slot da satırdır (sorunun en büyük olduğu yer).
 * Rol taktiğin slotundan (yoksa formasyonun varsayılanı); rol ve kalite sınıfı uyum satırından (varsa).
 */
export function buildDepthSlots(
  formation: { slots: { slotId: string; position: string; defaultRole: string }[] } | undefined,
  lineup: Readonly<Record<string, number | null | undefined>> | undefined,
  tacticSlots: Readonly<Record<string, { roleId?: string }>> | undefined,
  fitRows: { slotId: string; roleId?: string; weakClass?: WeakClass }[],
): DepthSlot[] {
  if (!formation) {
    return []
  }
  const fits = new Map(fitRows.map((r) => [r.slotId, r]))
  return formation.slots.map((s) => {
    const fit = fits.get(s.slotId)
    const id = lineup?.[s.slotId]
    return {
      slotId: s.slotId, position: s.position, roleId: fit?.roleId ?? tacticSlots?.[s.slotId]?.roleId ?? s.defaultRole,
      playerId: typeof id === 'number' ? id : undefined, weakClass: fit?.weakClass,
    }
  })
}
