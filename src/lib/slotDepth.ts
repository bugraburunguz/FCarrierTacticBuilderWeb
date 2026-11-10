import type { AcademyPlayer, CareerPlayer, DepthEntry } from '../api/types'
import type { WeakClass } from './fitLabels'

/** Derinlikte "Genç" kolonu ve yaş bandı sınırı. Kural Kadro › Derinlik ile Masa'nın derinlik işinde ortak (GT-b). */
export const YOUTH_MAX_AGE = 21

/**
 * Matris satırı: ana taktiğin (yoksa başlangıç önerisinin) slotu ve dizilen oyuncu; weakClass /fit/lineup sınıfı (kalite açığı).
 * depth: /fit/lineup slot.depth (FCA-15, sunucu tekil atar); alan yoksa (eski backend ya da uyum satırı yok) derinlik bilinmiyor.
 */
export interface DepthSlot {
  slotId: string
  position: string
  roleId: string
  playerId?: number
  weakClass?: WeakClass
  depth?: readonly DepthEntry[]
}

export interface DepthCell {
  id: number
  name: string
  /** Altyapı oyuncusunda bilinmeyebilir. */
  overall?: number
  age?: number
  /** Altyapı oyuncusu (Genç kolonunda). */
  academy?: boolean
  /** Yedek: sunucunun zayıf işareti ve bu slottaki Güç'ü. */
  weak?: boolean
  currentFit?: number
}

/** Aciliyet (satır başına tek, öncelik sırasıyla): yedek yok > yalnız genç yedek > yedek zayıf > ilk 11 ≥ 30 yaş > ilk 11 kalite açığı. */
export type SlotUrgency = 'NO_BACKUP' | 'YOUTH_ONLY' | 'WEAK_BACKUP' | 'OLD_STARTER' | 'QUALITY_GAP'

export const SLOT_URGENCY_LABEL: Record<SlotUrgency, string> = {
  NO_BACKUP: 'Yedek yok',
  YOUTH_ONLY: 'Yalnız genç yedek',
  WEAK_BACKUP: 'Yedek zayıf',
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
  /** Slotta /fit/lineup depth alanı geldi mi; gelmediyse Yedek kolonu "Derinlik bilgisi yok". */
  depthKnown: boolean
}

/** Aciliyet metni; zayıf yedekte Güç yazılır ("Yedek zayıf (Güç 41)"). */
export function urgencyLabel(row: Pick<SlotDepthRow, 'urgency' | 'backup'>): string {
  if (!row.urgency) {
    return ''
  }
  const fit = row.backup?.currentFit
  return row.urgency === 'WEAK_BACKUP' && fit !== undefined ? `${SLOT_URGENCY_LABEL.WEAK_BACKUP} (Güç ${Math.round(fit)})` : SLOT_URGENCY_LABEL[row.urgency]
}

const OLD_STARTER_AGE = 30
const QUALITY_GAP: ReadonlySet<WeakClass> = new Set(['KALITE_ACIGI', 'IKISI'])

const cell = (c: CareerPlayer): DepthCell => ({ id: c.player.id, name: c.player.name, overall: c.player.overall, age: c.player.age })
const academyCell = (p: AcademyPlayer): DepthCell => ({ id: p.playerId, name: p.name, overall: p.overall || undefined, age: p.age ?? undefined, academy: true })
const ovr = (c: DepthCell) => c.overall ?? 0
const young = (age?: number | null) => age !== undefined && age !== null && age <= YOUTH_MAX_AGE

/** Genç kolonu slotlar arasında tekil: her genç ilk mevkisine en yakın slotta (mevki sırası, sonra OVR, sonra slot sırası). */
function assignYouth(slots: DepthSlot[], youth: { cell: DepthCell; positions: readonly string[] }[]): (DepthCell | undefined)[] {
  const pairs = slots.flatMap((s, slotIndex) => youth.flatMap((y, youthIndex) => {
    const rank = y.positions.indexOf(s.position)
    return rank < 0 ? [] : [{ slotIndex, youthIndex, rank, ovr: ovr(y.cell) }]
  }))
  pairs.sort((a, b) => a.rank - b.rank || b.ovr - a.ovr || a.slotIndex - b.slotIndex)
  const out: (DepthCell | undefined)[] = slots.map(() => undefined)
  const taken = new Set<number>()
  pairs.forEach((p) => {
    if (!out[p.slotIndex] && !taken.has(p.youthIndex)) {
      out[p.slotIndex] = youth[p.youthIndex].cell
      taken.add(p.youthIndex)
    }
  })
  return out
}

/**
 * GT-b + FCA-15: slot bazlı derinlik. Yedek: /fit/lineup slotunun depth listesindeki ilk geçerli girdi (sunucu tekil atar: oyuncu en çok bir slotun
 * yedeği, kaleci yalnız kalede, ≤ 21 yok; web yalnız kadroda olmayan, kiralık gönderilen, ilk 11'deki ya da başka satırda kullanılanı atlar).
 * Genç: ilk 11 dışı ≤ 21 yaş kadro oyuncusu ya da altyapı oyuncusu, slotlar arasında tekil.
 */
export function slotDepth(slots: DepthSlot[], squad: CareerPlayer[], academy: AcademyPlayer[]): SlotDepthRow[] {
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  const starters = new Set(slots.flatMap((s) => (s.playerId !== undefined ? [s.playerId] : [])))
  const used = new Set<number>()
  const backups = slots.map((s): DepthCell | undefined => {
    const hit = (s.depth ?? []).find((d) => {
      const c = byId.get(d.playerId)
      return c !== undefined && !c.loanedOut && !starters.has(d.playerId) && !used.has(d.playerId)
    })
    if (!hit) {
      return undefined
    }
    used.add(hit.playerId)
    return { ...cell(byId.get(hit.playerId)!), weak: hit.weak ?? false, currentFit: hit.currentFit }
  })
  const youthPool = [
    ...squad.filter((c) => !starters.has(c.player.id) && !c.loanedOut && !used.has(c.player.id) && young(c.player.age))
      .map((c) => ({ cell: cell(c), positions: c.player.positions })),
    ...academy.map((p) => ({ cell: academyCell(p), positions: p.positions })),
  ]
  const youths = assignYouth(slots, youthPool)
  return slots.map((s, i): SlotDepthRow => {
    const starterEntry = s.playerId !== undefined ? byId.get(s.playerId) : undefined
    const starter = starterEntry ? cell(starterEntry) : undefined
    const backup = backups[i]
    const youth = youths[i]
    const depthKnown = s.depth !== undefined
    const academyAt = academy.filter((p) => p.positions.includes(s.position)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
    const urgency: SlotUrgency | undefined = depthKnown && !backup && !youth ? 'NO_BACKUP'
      : depthKnown && !backup ? 'YOUTH_ONLY'
        : backup?.weak ? 'WEAK_BACKUP'
          : starter?.age !== undefined && starter.age >= OLD_STARTER_AGE ? 'OLD_STARTER'
            : s.weakClass && QUALITY_GAP.has(s.weakClass) ? 'QUALITY_GAP' : undefined
    return { ...s, starter, backup, youth, urgency, academyName: academyAt[0]?.name, depthKnown }
  })
}

/**
 * Matris satırları her zaman formasyonun slotlarından (11): dizilmemiş ya da oyuncusu kadrodan çıkmış slot da satırdır (sorunun en büyük olduğu yer).
 * Rol taktiğin slotundan (yoksa formasyonun varsayılanı); rol, kalite sınıfı ve depth uyum satırından (varsa; /fit/lineup, aynı sorgu).
 */
export function buildDepthSlots(
  formation: { slots: { slotId: string; position: string; defaultRole: string }[] } | undefined,
  lineup: Readonly<Record<string, number | null | undefined>> | undefined,
  tacticSlots: Readonly<Record<string, { roleId?: string }>> | undefined,
  fitRows: { slotId: string; roleId?: string; weakClass?: WeakClass; depth?: readonly DepthEntry[] }[],
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
      playerId: typeof id === 'number' ? id : undefined, weakClass: fit?.weakClass, depth: fit?.depth,
    }
  })
}
