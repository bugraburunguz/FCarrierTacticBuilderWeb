import type { Career, CareerPlayer, CareerSnapshot } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft, daysBetween } from '../../lib/contract'
import { deskLink } from '../../lib/deskLinks'
import type { FitState } from '../../components/card/FitBadge'
import { FIT_STATE_TEXT, type FitLabel } from '../../lib/fitLabels'
import { ATTR_LABELS } from '../../lib/format'
import type { SlotFitRow } from '../squad/useSlotFits'

/** Kariyer Masası kuralları (KARIYER-UX 15 §4.1): saf fonksiyonlar; katman 1 (kayıt) + katman 2 (ana taktik) girdisi, taslak yok. */

const WEAK_SHOWN = 3
const LOAN_ALERT_DAYS = 30
/** Sunucu etiketine göre öncelik (FAZ 2 kararı 5): sarı/kırmızı önce, seviyesinde sonra; uygun hiç girmez. */
const LABEL_TIER: Partial<Record<FitLabel, number>> = { WEAK: 0, WRONG_ROLE: 0, AT_LEVEL: 1 }

export interface WeakLinkCard {
  slotId: string
  position: string
  roleId: string
  roleName: string
  playerId: number
  playerName: string
  /** Seviyesine göre % (levelFit). */
  pct: number
  state: FitState
  /** Etiket her zaman metin olarak ("Rol için eksik"); renk tek başına anlam taşımaz. */
  labelText: string
  reason?: string
  /** Birincil eylem: WRONG_ROLE → rolü değiştir (oyuncu iyi olabilir, rol yanlış; Lab FAZ 4), WEAK/AT_LEVEL → transferde aday. */
  primary: 'ROLE' | 'TRANSFER'
}

const REASON = /^(\S+) ([+-])(\d+(?:\.\d+)?)$/
const POSITION_KEY = /^[A-Z]{2,3}$/

/** Motorun katkı metni ("GKPositioning -25.3", "ST -6.2"; RoleFitV3Service) Türkçe etikete; tanınmayan metin aynen kalır. */
export function reasonText(raw: string): string {
  const m = REASON.exec(raw)
  if (!m) {
    return raw
  }
  const [, key, sign, points] = m
  const label = ATTR_LABELS[key] ?? (POSITION_KEY.test(key) ? `Mevki uyumu (${key})` : key)
  return `${label} ${sign === '-' ? '−' : '+'}${points.replace('.', ',')}`
}

/** Zayıf kartın nedeni: motorun katkıları içinde en büyük negatif olan (pozitif katkı zayıflığı açıklamaz); yoksa yok. */
export function worstReason(reasons: readonly string[] | undefined): string | undefined {
  const negative = (reasons ?? []).flatMap((raw) => {
    const m = REASON.exec(raw)
    return m && m[2] === '-' ? [{ raw, points: Number(m[3]) }] : []
  })
  const worst = negative.sort((a, b) => b.points - a.points)[0]
  return worst && reasonText(worst.raw)
}

export function weakLinks(rows: SlotFitRow[], limit = WEAK_SHOWN): WeakLinkCard[] {
  const tier = (r: SlotFitRow) => (r.fit.fitLabel ? LABEL_TIER[r.fit.fitLabel] : undefined)
  const level = (r: SlotFitRow) => r.fit.levelFit ?? r.display.pct
  return rows
    .filter((r) => tier(r) !== undefined)
    .sort((a, b) => tier(a)! - tier(b)! || level(a) - level(b) || a.slotId.localeCompare(b.slotId))
    .slice(0, limit)
    .map((r) => ({
      slotId: r.slotId, position: r.position, roleId: r.roleId, roleName: r.roleName, playerId: r.playerId, playerName: r.playerName,
      pct: Math.round(level(r)), state: r.display.state, labelText: FIT_STATE_TEXT[r.display.state].label, reason: worstReason(r.fit.reasons),
      primary: r.fit.fitLabel === 'WRONG_ROLE' ? 'ROLE' : 'TRANSFER',
    }))
}

export interface FinanceSummary {
  budget?: number
  budgetDelta?: number
  wageBudget?: number
  squadWage?: number
  wageUse?: number
  wageDelta?: number
  /** Kadroda maaşı kayıtta olmayan oyuncu sayısı ("N oyuncunun maaşı bilinmiyor"). */
  unknownWages: number
  daysLeft?: number
}

const positive = (value?: number | null) => (value !== undefined && value !== null && value > 0 ? value : undefined)

/**
 * Finansal sağlık. Δ: en son IMPORT snapshot'ı bugünkü kaydı temsil eder; fark ondan önceki IMPORT'a göre (MANUAL/OCR atlanır).
 * Kıyas değeri yoksa Δ yok. Maaş toplamı sunucudan (kadronun hepsinin maaşı biliniyorsa), yüzde uydurulmaz.
 */
export function financeSummary({ career, squadWageEur, squad, snapshots, gameDate }: {
  career: Career; squadWageEur?: number; squad: CareerPlayer[]; snapshots: CareerSnapshot[]; gameDate?: string
}): FinanceSummary {
  const budget = positive(career.budgetEur)
  const wageBudget = positive(career.wageBudgetEur)
  const previous = snapshots.filter((s) => s.source === 'IMPORT').sort((a, b) => b.takenAt.localeCompare(a.takenAt))[1]
  const diff = (now?: number, before?: number) => (now !== undefined && before !== undefined && before !== null ? now - before : undefined)
  return {
    budget,
    budgetDelta: diff(budget, previous?.budgetEur),
    wageBudget,
    squadWage: squadWageEur,
    wageUse: wageBudget !== undefined && squadWageEur !== undefined ? Math.round((squadWageEur / wageBudget) * 100) : undefined,
    wageDelta: diff(squadWageEur, previous?.squadWageEur),
    unknownWages: squad.filter((c) => c.wageEur === undefined || c.wageEur === null).length,
    daysLeft: daysBetween(gameDate, career.windowEndsOn),
  }
}

export interface UrgentAlert {
  kind: 'CONTRACT' | 'LOAN'
  playerId: number
  text: string
  /** Oyun tarihine göre kalan gün (sıralama). */
  days: number
  to: string
}

/** Zayıf halka kartında sözleşme satırının gösterildiği üst sınır (ay). */
export const WEAK_LINK_CONTRACT_MONTHS = 12

/**
 * Birleşik uyarı (KARIYER-UX 6): zayıf halka oyuncusunun sözleşmesi ≤ 12 ay içinde bitiyorsa karta kalan ay eklenir
 * (yerine aday aramak ile sözleşme uzatmak arasında karar). Oyun tarihi ya da sözleşme yoksa eklenmez.
 */
export function withContracts(cards: WeakLinkCard[], squad: CareerPlayer[], gameDate: string | undefined): (WeakLinkCard & { contractMonths?: number })[] {
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  return cards.map((card) => {
    const months = contractMonthsLeft(gameDate, byId.get(card.playerId)?.player.contractUntil)
    return months !== undefined && months <= WEAK_LINK_CONTRACT_MONTHS ? { ...card, contractMonths: months } : card
  })
}

/**
 * Acil uyarılar (oyun tarihine göre; yoksa hiç): sözleşmesi ≤ 6 ay kalan (kiralık gönderilen hariç), kiralık dönüşü ≤ 30 gün. En yakın önce.
 * KARIYER-UX 6: `starters` verilirse ilk 11 oyuncusunun sözleşme uyarısı "· ilk 11" der.
 */
export function urgentAlerts(squad: CareerPlayer[], gameDate: string | undefined, starters?: ReadonlySet<number>): UrgentAlert[] {
  if (!gameDate) {
    return []
  }
  const result: UrgentAlert[] = []
  squad.forEach((c) => {
    const loanDays = c.onLoan ? daysBetween(gameDate, c.loanUntil) : undefined
    if (loanDays !== undefined && loanDays >= 0 && loanDays <= LOAN_ALERT_DAYS) {
      const text = c.loanedOut ? `${c.player.name} kiralıktan dönüyor · ${loanDays} gün` : `${c.player.name} kiralık süresi bitiyor · ${loanDays} gün`
      result.push({ kind: 'LOAN', playerId: c.player.id, text, days: loanDays, to: deskLink.loans() })
    }
    const months = c.loanedOut ? undefined : contractMonthsLeft(gameDate, c.player.contractUntil)
    if (months !== undefined && months <= CONTRACT_MONTHS) {
      result.push({ kind: 'CONTRACT', playerId: c.player.id, text: `${c.player.name} · sözleşme ${months} ay${starters?.has(c.player.id) ? ' · ilk 11' : ''}`, days: daysBetween(gameDate, c.player.contractUntil)!, to: deskLink.contract(c.player.id) })
    }
  })
  return result.sort((a, b) => a.days - b.days)
}

export interface UpcomingEvent {
  key: string
  date: string
  text: string
}

/** Zaman çizelgesinin gelecek kısmı, istemcide türetilir (sunucuya yazılmaz): dönem sonu, kiralık bitişleri, ≤ 6 ay içinde biten sözleşmeler. */
export function upcomingEvents(career: Pick<Career, 'windowEndsOn'>, squad: CareerPlayer[], gameDate: string | undefined): UpcomingEvent[] {
  if (!gameDate) {
    return []
  }
  const ahead = (date?: string) => {
    const days = daysBetween(gameDate, date)
    return days !== undefined && days >= 0
  }
  const events: UpcomingEvent[] = []
  if (ahead(career.windowEndsOn)) {
    events.push({ key: 'window', date: career.windowEndsOn!.slice(0, 10), text: 'Transfer dönemi sonu' })
  }
  squad.forEach((c) => {
    if (c.onLoan && ahead(c.loanUntil)) {
      events.push({ key: `loan-${c.player.id}`, date: c.loanUntil!.slice(0, 10), text: `${c.player.name} · kiralık bitiyor` })
    }
    const months = c.loanedOut ? undefined : contractMonthsLeft(gameDate, c.player.contractUntil)
    if (months !== undefined && months <= CONTRACT_MONTHS && ahead(c.player.contractUntil)) {
      events.push({ key: `contract-${c.player.id}`, date: c.player.contractUntil!.slice(0, 10), text: `${c.player.name} · sözleşme bitiyor` })
    }
  })
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}
