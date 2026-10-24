import type { Career, CareerPlayer, CareerSnapshot } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft, daysBetween } from '../../lib/contract'
import { deskLink } from '../../lib/deskLinks'
import { SNAPSHOT_LABEL } from '../../lib/deskRules'
import type { FitState } from '../../components/card/FitBadge'
import { FIT_STATE_TEXT, isWeakFit } from '../../lib/fitLabels'
import { ATTR_LABELS } from '../../lib/format'
import type { SlotFitRow } from '../squad/useSlotFits'

/** Kariyer Masası kuralları (KARIYER-UX 15 §4.1): saf fonksiyonlar; katman 1 (kayıt) + katman 2 (ana taktik) girdisi, taslak yok. */

const WEAK_SHOWN = 3
const LOAN_ALERT_DAYS = 30

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
  /** Birincil eylem: WRONG_ROLE → rolü değiştir (oyuncu iyi olabilir, rol yanlış; Lab FAZ 4), WEAK → transferde aday. */
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

/**
 * Zayıf halka tek kuralla (FAZ 6a-G, lib/fitLabels.isWeakFit): yalnız WEAK ve WRONG_ROLE; "Rol için seviyesinde" (AT_LEVEL) ve uygun girmez.
 * Masa'nın 3 işi (deskRules.weakSlots) ve Transfer İhtiyaçları aynı kuralı kullanır. Üç dolmazsa daha az kart.
 */
export function weakLinks(rows: SlotFitRow[], limit = WEAK_SHOWN): WeakLinkCard[] {
  const level = (r: SlotFitRow) => r.fit.levelFit ?? r.display.pct
  return rows
    .filter((r) => isWeakFit(r.fit.fitLabel))
    .sort((a, b) => level(a) - level(b) || a.slotId.localeCompare(b.slotId))
    .slice(0, limit)
    .map((r) => ({
      slotId: r.slotId, position: r.position, roleId: r.roleId, roleName: r.roleName, playerId: r.playerId, playerName: r.playerName,
      pct: Math.round(level(r)), state: r.display.state, labelText: FIT_STATE_TEXT[r.display.state].label, reason: worstReason(r.fit.reasons),
      primary: r.fit.fitLabel === 'WRONG_ROLE' ? 'ROLE' : 'TRANSFER',
    }))
}

export interface RecordGap {
  key: 'gameDate' | 'contracts' | 'loans'
  missing: string
  affects: string
}

/**
 * Masa'nın "Kayıt verisi eksik" bandı (FAZ 6a-A): kayıtta (içe aktarma) olmayan veriler ve neyi etkiledikleri. Boş kutular tek tek gösterilmez;
 * bant ne eksik, neyi etkiliyor ve nasıl tamamlanır söyler. Facets yüklenmemişse yalnız oyun tarihi değerlendirilir (eksik uydurulmaz).
 */
export function recordGaps(gameDate: string | undefined, facets: { contractData: boolean; loanData: boolean } | undefined): RecordGap[] {
  const gaps: RecordGap[] = []
  if (!gameDate) {
    gaps.push({ key: 'gameDate', missing: 'Oyun tarihi', affects: 'dönem sonuna kalan gün, sözleşme ve kiralık uyarıları, yaklaşan tarihler' })
  }
  if (facets && !facets.contractData) {
    gaps.push({ key: 'contracts', missing: 'Maaş ve sözleşme', affects: 'maaş bütçesi kullanımı, sözleşme bitişleri' })
  }
  if (facets && !facets.loanData) {
    gaps.push({ key: 'loans', missing: 'Kiralık bitişi', affects: 'kiralık dönüş uyarıları' })
  }
  return gaps
}

const NAMES_SHOWN = 3
const names = (list: string[]) => (list.length > NAMES_SHOWN ? `${list.slice(0, NAMES_SHOWN).join(', ')} +${list.length - NAMES_SHOWN}` : list.join(', '))

/**
 * Zaman çizelgesinin görüntü satırları (FAZ 6a-E): aynı UTC gününe düşen aynı kaynaklı görüntüler tek satır ("İçe aktarma ×3"); metin dünya
 * oyuncu sayısı değil kadro sayısı ve gün içindeki net giren/çıkan. Kadro bilgisi olmayan (eski) görüntüde yalnız tür.
 */
export function snapshotTimeline(snapshots: CareerSnapshot[]): { key: string; at: string; text: string }[] {
  const groups: CareerSnapshot[][] = []
  const newestFirst = [...snapshots].sort((a, b) => b.takenAt.localeCompare(a.takenAt))
  for (const s of newestFirst) {
    const last = groups.at(-1)
    if (last && last[0].source === s.source && last[0].takenAt.slice(0, 10) === s.takenAt.slice(0, 10)) {
      last.push(s)
    } else {
      groups.push([s])
    }
  }
  return groups.map((group) => {
    const newest = group[0]
    const joined: string[] = []
    const left: string[] = []
    ;[...group].reverse().forEach((s) => {
      ;(s.squadJoined ?? []).forEach((n) => (left.includes(n) ? left.splice(left.indexOf(n), 1) : joined.push(n)))
      ;(s.squadLeft ?? []).forEach((n) => (joined.includes(n) ? joined.splice(joined.indexOf(n), 1) : left.push(n)))
    })
    const parts = [`${SNAPSHOT_LABEL[newest.source] ?? 'Güncelleme'}${group.length > 1 ? ` ×${group.length}` : ''}`]
    if (newest.squadCount !== undefined) {
      parts.push(`kadro: ${newest.squadCount} oyuncu`)
    }
    if (joined.length > 0) {
      parts.push(`giren: ${names(joined)}`)
    }
    if (left.length > 0) {
      parts.push(`çıkan: ${names(left)}`)
    }
    return { key: `s${newest.id}`, at: newest.takenAt, text: parts.join(' · ') }
  })
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
