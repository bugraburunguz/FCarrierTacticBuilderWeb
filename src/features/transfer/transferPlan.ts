import type { CareerPlayer, PlayerTag, ShortlistItem } from '../../api/types'
import type { FitState } from '../../components/card/FitBadge'
import { depthRows, GROUP_LABEL, TRANSFER_ROLE_BY_GROUP } from '../../lib/deskRules'
import { levelText, roleFitText } from '../../lib/fitLabels'
import { weakLinks } from '../dashboard/dashboardRules'
import { needsFromFits, type SlotFitRow } from '../squad/useSlotFits'

/** Transfer Merkezi (v2 CAR-23 ve v3 V3-06c ortak): ihtiyaçlar, bütçe etkisi ve sözleşme süresi hesapları; saf fonksiyonlar. */

export interface TransferNeed {
  key: string
  /** Zayıf slot ihtiyacında slot (öneri ucuna `slotId` gider); derinlik açığında yok. */
  slotId?: string
  position: string
  roleId: string
  label: string
  detail: string
  state?: FitState
}

const slotNeed = (r: { slotId: string; position: string; roleId: string; roleName: string; playerName: string }, pct: number, state: FitState, text: (pct: number) => string = levelText): TransferNeed =>
  ({ key: `slot-${r.slotId}`, slotId: r.slotId, position: r.position, roleId: r.roleId, label: `${r.position} · ${r.roleName}`, detail: `${r.playerName} · ${text(pct)}`, state })

const depthNeeds = (squad: CareerPlayer[]): TransferNeed[] => depthRows(squad).filter((d) => d.short > 0)
  .map((d) => ({ key: `depth-${d.group}`, ...TRANSFER_ROLE_BY_GROUP[d.group], label: `${GROUP_LABEL[d.group]} · derinlik`, detail: `${d.have}/${d.need} oyuncu` }))

/** İhtiyaçlar (v2): sahadaki rozetle aynı kaynak (zayıf halkalar, seviyesine göre artan; `all` ile tüm dizilim) + derinlik açıkları. */
export function transferNeeds(fitRows: SlotFitRow[], all: boolean, squad: CareerPlayer[]): TransferNeed[] {
  return [...needsFromFits(fitRows, all).map((r) => slotNeed(r, r.display.pct, r.display.state)), ...depthNeeds(squad)]
}

/**
 * İhtiyaçlar (v3, KARIYER-UX FAZ 5): Masa'nın zayıf halka kuralı (`weakLinks`, sınırsız) — Masa ile aynı sıra ve kapsam; `all` ile tüm dizilim
 * (seviyesine göre artan). Ardından derinlik açıkları.
 */
export function needsForTransfer(fitRows: SlotFitRow[], all: boolean, squad: CareerPlayer[]): TransferNeed[] {
  // FIT-1: v3 kariyer adıyla ("Rol oturması %12"); v2 transferNeeds eski metni korur.
  const slots = all
    ? [...fitRows].sort((a, b) => a.display.pct - b.display.pct).map((r) => slotNeed(r, r.display.pct, r.display.state, roleFitText))
    : weakLinks(fitRows, Number.POSITIVE_INFINITY).map((w) => slotNeed(w, w.pct, w.state, roleFitText))
  return [...slots, ...depthNeeds(squad)]
}

export interface Tally {
  total: number
  unknown: number
  count: number
}

const valueOf = (c: CareerPlayer) => c.valueEur ?? c.player.valueEur

/** Satış planı geliri (15 §7.2): FOR_SALE işaretlilerin istenen bedeli, yoksa değeri; ikisi de yoksa bilinmeyen sayılır. */
export function salesIncome(squad: CareerPlayer[], tags: PlayerTag[]): Tally {
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  const forSale = tags.filter((t) => t.tag === 'FOR_SALE' && byId.has(t.playerId))
  const known = forSale.flatMap((t) => {
    const price = t.askingPriceEur ?? valueOf(byId.get(t.playerId)!)
    return price === undefined ? [] : [price]
  })
  return { total: known.reduce((a, b) => a + b, 0), unknown: forSale.length - known.length, count: forSale.length }
}

export type WageImpact =
  | { kind: 'empty' }
  | { kind: 'unknown'; unknown: number }
  /** Haftalık maaş farkı (kısa liste − satılacaklar); maaş bütçesi biliniyorsa ona oranı. */
  | { kind: 'known'; deltaEur: number; share?: number }

export interface BudgetPlan {
  shortlist: Tally
  sales: Tally
  /** Bütçe − kısa liste + satış planı; bütçe bilinmiyorsa yok (0 değil, ENG-02). */
  remaining?: number
  wage: WageImpact
}

/**
 * Bütçe planı (15 §4.4). Maaş etkisi = kısa listenin maaşı − satılacakların maaşı. Kısa liste oyuncusunun maaşı katalogda yok, kadronun maaşı yalnız
 * kayıttan (LE içe aktarması); biri bile bilinmiyorsa etki hesaplanmaz (kısmi toplam tam toplam gibi gösterilmez).
 */
export function budgetPlan({ budgetEur, wageBudgetEur, shortlist, squad, tags }: {
  budgetEur?: number; wageBudgetEur?: number; shortlist: ShortlistItem[]; squad: CareerPlayer[]; tags: PlayerTag[]
}): BudgetPlan {
  const cost = shortlistCost(shortlist)
  const sales = salesIncome(squad, tags)
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  const selling = tags.filter((t) => t.tag === 'FOR_SALE' && byId.has(t.playerId)).map((t) => byId.get(t.playerId)!)
  const sellingWages = selling.map((c) => c.wageEur)
  const unknownWages = shortlist.length + sellingWages.filter((w) => w === undefined).length
  const deltaEur = -sellingWages.reduce<number>((a, w) => a + (w ?? 0), 0)
  const wage: WageImpact = shortlist.length + selling.length === 0 ? { kind: 'empty' }
    : unknownWages > 0 ? { kind: 'unknown', unknown: unknownWages }
      : { kind: 'known', deltaEur, share: wageBudgetEur ? deltaEur / wageBudgetEur : undefined }
  return {
    shortlist: { total: cost.total ?? 0, unknown: cost.unknown, count: cost.count },
    sales,
    remaining: budgetEur === undefined ? undefined : budgetEur - (cost.total ?? 0) + sales.total,
    wage,
  }
}

/** Alım sonrası bütçe (sunucunun /contract hesabıyla aynı): bütçe ya da bedel bilinmiyorsa yok (0 değil, ENG-02). */
export function budgetAfterPurchase(budgetEur: number | undefined, costEur: number | undefined): number | undefined {
  return budgetEur === undefined || costEur === undefined ? undefined : budgetEur - costEur
}

/** Kısa listenin tahmini bedeli: oyuncu başına pazarlık tavanı, yoksa piyasa değeri; ikisi de yoksa sayılmaz (bilinmeyen sayısı ayrı). */
export function shortlistCost(items: ShortlistItem[]): { total: number | undefined; unknown: number; count: number } {
  const known = items.flatMap((s) => {
    const cost = s.maxFeeEur ?? s.player?.valueEur
    return cost === undefined ? [] : [cost]
  })
  return { total: known.length === 0 ? undefined : known.reduce((a, b) => a + b, 0), unknown: items.length - known.length, count: items.length }
}

/** Tek kaynak lib/contract (Masa uyarısı ve liste süzgeciyle aynı hesap). */
export { contractMonthsLeft } from '../../lib/contract'
