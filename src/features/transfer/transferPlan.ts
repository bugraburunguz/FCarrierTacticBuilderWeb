import type { CareerPlayer, ShortlistItem } from '../../api/types'
import type { FitState } from '../../components/card/FitBadge'
import { depthRows, GROUP_LABEL, TRANSFER_ROLE_BY_GROUP } from '../../lib/deskRules'
import { levelText } from '../../lib/fitLabels'
import { needsFromFits, type SlotFitRow } from '../squad/useSlotFits'

/** Transfer Merkezi (v2 CAR-23 ve v3 V3-06c ortak): ihtiyaçlar, bütçe etkisi ve sözleşme süresi hesapları; saf fonksiyonlar. */

export interface TransferNeed {
  key: string
  position: string
  roleId: string
  label: string
  detail: string
  state?: FitState
}

/** İhtiyaçlar: sahadaki rozetle aynı kaynak (zayıf halkalar, seviyesine göre artan; `all` ile tüm dizilim) + derinlik açıkları. */
export function transferNeeds(fitRows: SlotFitRow[], all: boolean, squad: CareerPlayer[]): TransferNeed[] {
  const weak = needsFromFits(fitRows, all).map((r) => ({ key: `slot-${r.slotId}`, position: r.position, roleId: r.roleId, label: `${r.position} · ${r.roleName}`, detail: `${r.playerName} · ${levelText(r.display.pct)}`, state: r.display.state }))
  const gaps = depthRows(squad).filter((d) => d.short > 0).map((d) => ({ key: `depth-${d.group}`, ...TRANSFER_ROLE_BY_GROUP[d.group], label: `${GROUP_LABEL[d.group]} · derinlik`, detail: `${d.have}/${d.need} oyuncu` }))
  return [...weak, ...gaps]
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
