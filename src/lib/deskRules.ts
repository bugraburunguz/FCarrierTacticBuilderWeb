import type { CareerPlayer, CareerSnapshot, RosterEventType } from '../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft, daysBetween } from './contract'
import { deskLink } from './deskLinks'
import { isWeakClass, roleFitText, WEAK_CLASS_TEXT, type FitLabel, type WeakClass } from './fitLabels'

/** Masa, saha ve İhtiyaçlar aynı v3 rol uyumundan okur: dizilimdeki bir slot (fitLabels sözlüğüyle). */
export interface DeskSlot {
  slotId: string
  position: string
  roleId: string
  playerId?: number
  playerName?: string
  /** Rol oturması % (levelFit); yoksa Güç. */
  pct: number
  fitLabel?: FitLabel | null
  /** FIT-1 madde 2: sunucunun iki eksenli sınıfı; yoksa etiket kuralı. */
  weakClass?: WeakClass
}

/** Kariyer "Menajer Masası" kuralları (13 §3.1, §5): saf fonksiyonlar, sunucuya gitmeden masada gösterilir; her öneri gerekçelidir. */

export type PositionGroup = 'GK' | 'CB' | 'FB' | 'MID' | 'W' | 'ST'

const GROUP_OF: Record<string, PositionGroup> = {
  GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST',
}
export const GROUP_LABEL: Record<PositionGroup, string> = { GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', MID: 'Orta saha', W: 'Kanat', ST: 'Forvet' }
const MIN_DEPTH: Record<PositionGroup, number> = { GK: 2, CB: 3, FB: 3, MID: 4, W: 2, ST: 2 }

/** Derinlik açığında aday aranan (mevki, rol): roleId'ler /roles'taki gerçek id'lerdir (deskRules.test doğrular). */
export const TRANSFER_ROLE_BY_GROUP: Record<PositionGroup, { position: string; roleId: string }> = {
  GK: { position: 'GK', roleId: 'goalkeeper_defend' },
  CB: { position: 'CB', roleId: 'defender_defend' },
  FB: { position: 'LB', roleId: 'fullback_defend' },
  MID: { position: 'CM', roleId: 'box_to_box_balanced' },
  W: { position: 'RW', roleId: 'winger_attack' },
  ST: { position: 'ST', roleId: 'poacher_attack' },
}

const SELL_AGE = 29
const LOAN_MAX_AGE = 21
const LOAN_MIN_GAP = 6

export interface DepthRow {
  group: PositionGroup
  /** Eşikte sayılan: birincil + ⌊ikincil/2⌋. */
  have: number
  primary: number
  secondary: number
  need: number
  short: number
}

export function groupOf(position?: string): PositionGroup | undefined {
  return position ? GROUP_OF[position] : undefined
}

export function ageProfile(squad: CareerPlayer[]): { average: number; buckets: { label: string; count: number }[] } {
  const ages = squad.flatMap((c) => (c.player.age ? [c.player.age] : []))
  const edges: [string, number, number][] = [['≤20', 0, 20], ['21-23', 21, 23], ['24-26', 24, 26], ['27-29', 27, 29], ['30+', 30, 99]]
  return {
    average: ages.length === 0 ? 0 : Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10,
    buckets: edges.map(([label, lo, hi]) => ({ label, count: ages.filter((a) => a >= lo && a <= hi).length })),
  }
}

export interface Capacity {
  /** Ana (ilk listelenen) mevkisi bu olanlar. */
  primary: CareerPlayer[]
  /** Bu mevkiyi ikincil olarak listeleyenler. */
  secondary: CareerPlayer[]
}

/**
 * TEK derinlik tanımı (FAZ 6a-B): mevki kapasitesi oyuncunun listelenen mevkilerinin hepsini sayar; ana mevki birincil, diğerleri ikincil.
 * Kiralık gönderilen sayılmaz. Mevki yoğunluğu (squadDensity), mevki grupları (groupRoster) ve Masa'nın derinlik işi (depthRows) bundan okur.
 */
export function positionCapacity(squad: CareerPlayer[]): Map<string, Capacity> {
  const capacity = new Map<string, Capacity>()
  squad.filter((c) => !c.loanedOut).forEach((c) => {
    c.player.positions.forEach((position, index) => {
      const entry = capacity.get(position) ?? { primary: [], secondary: [] }
      ;(index === 0 ? entry.primary : entry.secondary).push(c)
      capacity.set(position, entry)
    })
  })
  return capacity
}

/** Grup kapasitesi: oyuncu grupta bir kez sayılır; ana mevkisi o gruptaysa birincil, yalnız ikincil mevkisi o gruptaysa ikincil. */
export function groupCapacity(squad: CareerPlayer[]): Map<PositionGroup, Capacity> {
  const groups = new Map<PositionGroup, Capacity>()
  positionCapacity(squad).forEach((entry, position) => {
    const group = groupOf(position)
    if (!group) {
      return
    }
    const target = groups.get(group) ?? { primary: [], secondary: [] }
    entry.primary.forEach((c) => target.primary.push(c))
    entry.secondary.filter((c) => groupOf(c.player.positions[0]) !== group).forEach((c) => target.secondary.push(c))
    groups.set(group, target)
  })
  groups.forEach((entry) => {
    entry.secondary = [...new Set(entry.secondary)]
  })
  return groups
}

/**
 * Mevki grubu başına eldeki oyuncu (grup kapasitesi) ve beklenen asgari derinlik. Eşik ağırlıklı: birincil + ⌊ikincil/2⌋ (Buğra kararı,
 * 6a açık soru 1; depth.analyzeDepth ile aynı kural) — ikincil oyuncu iki grubu birden tam doldurmaz. Birincil/ikincil ayrımı ayrıca döner.
 */
export function depthRows(squad: CareerPlayer[]): DepthRow[] {
  const groups = groupCapacity(squad)
  return (Object.keys(MIN_DEPTH) as PositionGroup[]).map((group) => {
    const primary = groups.get(group)?.primary.length ?? 0
    const secondary = groups.get(group)?.secondary.length ?? 0
    const have = primary + Math.floor(secondary / 2)
    return { group, have, primary, secondary, need: MIN_DEPTH[group], short: Math.max(0, MIN_DEPTH[group] - have) }
  })
}

export interface WeakSlot {
  slotId: string
  position: string
  roleId: string
  playerName?: string
  fit: number
  label?: FitLabel | null
  weakClass?: WeakClass
}

/** Zayıf halkalar: sunucu sınıfı UYGUN olmayanlar (FIT-1); sınıf yoksa rozeti sarı/kırmızı olanlar. En zayıf başta. */
export function weakSlots(slots: DeskSlot[]): WeakSlot[] {
  return slots
    .filter((s) => isWeakClass(s.weakClass, s.fitLabel))
    .map((s) => ({ slotId: s.slotId, position: s.position, roleId: s.roleId, playerName: s.playerName, fit: s.pct, label: s.fitLabel, weakClass: s.weakClass }))
    .sort((a, b) => a.fit - b.fit)
}

export type ActionKind = 'FILL' | 'SELL' | 'LOAN' | 'DEPTH' | 'CONTRACT'

export interface DeskAction {
  kind: ActionKind
  title: string
  reason: string
  to: string
  priority: number
  /** FILL işinin slotu (V3-06e: v3 Masa "Zayıf halkalar"da gösterilen slotu işlerde tekrar etmez). */
  slotId?: string
}

interface ActionInput {
  squad: CareerPlayer[]
  slots: DeskSlot[]
  tags: Record<number, string>
  /** Verilirse sözleşme işleri de üretilir (oyun tarihine göre, CONTRACT uyarısıyla aynı kural); v2 Masa vermez. */
  gameDate?: string
}

/** Sözleşme işi önceliği: satışın (40+) altında, derinliğin (20 + 5·eksik) üstünde; bitime yaklaştıkça artar. */
const CONTRACT_PRIORITY = 35

const money = (value?: number) => (value === undefined ? '—' : value >= 1_000_000 ? `€${(value / 1_000_000).toFixed(1)}M` : `€${Math.round(value / 1000)}K`)

export interface SellAdvice {
  kind: 'SELL' | 'LOAN' | 'KEEP'
  reason: string
}

/**
 * Oyuncu başına sat / kirala / tut (Masa "3 iş" ve Transfer Merkezi satış planı tek kural, V3-06c): ilk 11 dışı + (satılık etiketi ya da 29+ yaş ve değeri var) → sat;
 * ilk 11 dışı + ≤ 21 yaş + potansiyel ≥ 6 puan üstünde + kilitli değil → kirala; diğerleri tut. Gerekçe kısa metin.
 */
export function sellAdvice(c: CareerPlayer, starters: Set<number>, tags: Record<number, string>): SellAdvice {
  if (c.loanedOut) {
    return { kind: 'KEEP', reason: 'Başka kulüpte kiralık' }
  }
  if (starters.has(c.player.id)) {
    return { kind: 'KEEP', reason: "İlk 11'de" }
  }
  const age = c.player.age ?? 0
  const gap = (c.player.potential ?? c.player.overall) - c.player.overall
  if (tags[c.player.id] === 'FOR_SALE' || (age >= SELL_AGE && (c.player.valueEur ?? 0) > 0)) {
    return { kind: 'SELL', reason: `${age} yaşında, ilk 11'de değil, tahmini değer ${money(c.player.valueEur)}${tags[c.player.id] === 'FOR_SALE' ? ' (satılık işaretli)' : ''}.` }
  }
  if (age > 0 && age <= LOAN_MAX_AGE && gap >= LOAN_MIN_GAP && tags[c.player.id] !== 'LOCKED') {
    return { kind: 'LOAN', reason: `${age} yaşında, potansiyeli ${gap} puan üstünde ama ilk 11'de değil.` }
  }
  return { kind: 'KEEP', reason: 'Satış ya da kiralama kuralına girmiyor' }
}

/** "Bu dönemin 3 işi": SquadFit artışı, satış değeri ve genç gelişimi kurallarıyla en etkili üç eylem. */
export function suggestActions(input: ActionInput): DeskAction[] {
  return rankActions(input).slice(0, 3)
}

const SEASON_JOBS = 3

export interface SeasonJobs {
  jobs: DeskAction[]
  /** Gösterilen işle aynı türden kalanlar ("+N benzer"), öncelik sırasıyla. */
  similar: Partial<Record<ActionKind, DeskAction[]>>
}

/**
 * "Bu dönemin 3 işi" TEK KAYNAK (KARIYER-UX FAZ 2): Ana sayfa ve Masa bu fonksiyonu ve `features/career/SeasonJobs` bileşenini kullanır.
 * `exclude`: Masa'da "Zayıf halkalar" kartında zaten gösterilen slotların FILL işi tekrar edilmez (V3-06e).
 * FAZ 6a-D çeşitlilik: öncelik sırasıyla, aynı türden en çok bir iş; aynı türün kalanları `similar`'da. Türler azsa üçten az iş.
 */
export function seasonJobs(input: ActionInput, { exclude, limit = SEASON_JOBS }: { exclude?: ReadonlySet<string>; limit?: number } = {}): SeasonJobs {
  const jobs: DeskAction[] = []
  const similar: SeasonJobs['similar'] = {}
  for (const action of rankActions(input).filter((a) => !(a.kind === 'FILL' && a.slotId && exclude?.has(a.slotId)))) {
    if (jobs.some((j) => j.kind === action.kind)) {
      similar[action.kind] = [...(similar[action.kind] ?? []), action]
    } else if (jobs.length < limit) {
      jobs.push(action)
    }
  }
  return { jobs, similar }
}

/** İşin kural kaynağı (veri katmanı etiketi): diziliş ve etiketlere dayananlar taktik kaynağından (karar ya da öneri), sözleşme/derinlik kayıttan. */
export function jobLayer(kind: ActionKind): 'tactic' | 'record' {
  return kind === 'DEPTH' || kind === 'CONTRACT' ? 'record' : 'tactic'
}

/** Tüm işler öncelik sırasıyla (V3-06e: v3 Masa, zayıf halka kartlarında gösterilen slotları çıkarıp ilk 3'ü alır). */
export function rankActions({ squad, slots, tags, gameDate }: ActionInput): DeskAction[] {
  const starters = new Set(slots.flatMap((s) => (s.playerId ? [s.playerId] : [])))
  const actions: DeskAction[] = []

  weakSlots(slots).slice(0, 2).forEach((w, index) => {
    // FIT-1 madde 2: sunucu sınıfı varsa başlık ve eylem ondan (ROL_UYUMSUZ → Lab'da rol, diğerleri → transfer).
    const classified = w.weakClass && w.weakClass !== 'UYGUN' ? w.weakClass : undefined
    actions.push({
      slotId: w.slotId,
      kind: 'FILL',
      title: classified ? `${w.position}: ${WEAK_CLASS_TEXT[classified]}` : `${w.position}: zayıf halka (${roleFitText(w.fit)})`,
      reason: classified === 'ROL_UYUMSUZ' ? `${w.playerName ?? 'Oyuncu'} güçlü ama rolüne oturmuyor; Lab'da rolünü değiştirmeyi dene.`
        : classified ? `${w.playerName ?? 'Slot'} takımın en zayıf halkalarından; daha güçlü adayları Transfer Merkezi'nde gör.`
          : `${w.playerName ?? 'Slot'} bu rolü ${w.label === 'WRONG_ROLE' ? 'oynayamıyor' : 'sınırda oynuyor'}; adayları Transfer Merkezi'nde gör.`,
      to: classified === 'ROL_UYUMSUZ' ? deskLink.lab(w.slotId) : deskLink.candidate(w.slotId, w.position, w.roleId),
      priority: 100 - w.fit - index,
    })
  })

  squad.forEach((c) => {
    const advice = sellAdvice(c, starters, tags)
    if (advice.kind === 'SELL') {
      actions.push({
        kind: 'SELL',
        title: `Sat: ${c.player.name}`,
        reason: advice.reason,
        to: deskLink.sell(c.player.id),
        priority: 40 + (tags[c.player.id] === 'FOR_SALE' ? 25 : 0) + Math.min(20, (c.player.valueEur ?? 0) / 1_000_000),
      })
    } else if (advice.kind === 'LOAN') {
      actions.push({
        kind: 'LOAN',
        title: `Süre ver ya da kirala: ${c.player.name}`,
        reason: advice.reason,
        to: deskLink.growth(c.player.id),
        priority: 30 + ((c.player.potential ?? c.player.overall) - c.player.overall),
      })
    }
  })

  depthRows(squad).filter((d) => d.short > 0).forEach((d) => {
    actions.push({
      kind: 'DEPTH',
      title: `Derinlik: ${GROUP_LABEL[d.group]} ${d.have}/${d.need}`,
      reason: `${GROUP_LABEL[d.group]} grubunda ${d.short} oyuncu eksik; sakatlık ve rotasyonda açık kalır.`,
      to: deskLink.depth(d.group),
      priority: 20 + d.short * 5,
    })
  })

  if (gameDate) {
    squad.filter((c) => !c.loanedOut).forEach((c) => {
      const months = contractMonthsLeft(gameDate, c.player.contractUntil)
      if (months !== undefined && months <= CONTRACT_MONTHS) {
        actions.push({
          kind: 'CONTRACT',
          title: `Sözleşme: ${c.player.name}`,
          reason: `Sözleşmesi ${months} ay içinde bitiyor (oyun tarihine göre); uzat ya da değeri düşmeden sat.`,
          to: deskLink.contract(c.player.id),
          priority: CONTRACT_PRIORITY + (CONTRACT_MONTHS - months),
        })
      }
    })
  }

  return actions.sort((a, b) => b.priority - a.priority)
}

export type AlertKind = 'CONTRACT' | 'PLATEAU' | 'AGE' | 'DEPTH' | 'WINDOW'

export interface DeskAlert {
  tone: 'warn' | 'info'
  text: string
  kind: AlertKind
}

/** Zaman çizelgesi etiketleri (WEB-BUG-17): ham olay/kaynak kodu gösterilmez. */
export const EVENT_LABEL: Record<RosterEventType, string> = {
  BUY: 'Alım',
  SELL: 'Satış',
  LOAN_IN: 'Kiralık geldi',
  LOAN_OUT: 'Kiralık gönderildi',
  PROMOTE: 'Altyapıdan yükseldi',
}
export const SNAPSHOT_LABEL: Record<CareerSnapshot['source'], string> = { IMPORT: 'İçe aktarma', MANUAL: 'Elle güncelleme', OCR: 'Ekran görüntüsü' }

const WINDOW_ALERT_DAYS = 14
const PLATEAU_MAX_AGE = 24

/** Plato (tek kaynak; Masa uyarısı ve Gelişim): genç (≤ 24 yaş) oyuncu potansiyeline ulaştı (OVR ≥ POT). POT yoksa plato yok. */
export function isPlateau(player: { overall: number; potential?: number; age?: number }): boolean {
  return player.potential !== undefined && player.overall >= player.potential && (player.age ?? 99) <= PLATEAU_MAX_AGE
}

/** Transfer dönemi bitimine kalan gün, oyun tarihine göre (ENG-04); dönem sonu ya da oyun tarihi yoksa yok. */
export function windowDaysLeft(windowEndsOn: string | undefined, gameDate: string | undefined): number | undefined {
  return daysBetween(gameDate, windowEndsOn)
}

/**
 * Uyarı kuralları (13 §3.1): sözleşmesi bitmek üzere (oyun tarihine göre ≤ CONTRACT_MONTHS ay; V3-06d), plato (≤ 24 yaş, OVR ≥ POT), yaş (30+, düşüşte),
 * derinlik açığı, dönem sonu (oyun tarihi verilirse ona göre, ENG-04). Verisi olmayan tip hiç üretilmez.
 */
export function alerts(input: ActionInput & { diffRows: { kind: string; playerId: number; name: string; overallFrom?: number; overallTo?: number }[]; windowEndsOn?: string; today?: Date; gameDate?: string }): DeskAlert[] {
  const result: DeskAlert[] = []
  if (input.gameDate) {
    input.squad.filter((c) => !c.loanedOut).forEach((c) => {
      const months = contractMonthsLeft(input.gameDate, c.player.contractUntil)
      if (months !== undefined && months <= CONTRACT_MONTHS) {
        result.push({ kind: 'CONTRACT', tone: 'warn', text: `${c.player.name}: sözleşmesi ${months} ay içinde bitiyor.` })
      }
    })
  }
  input.squad.forEach((c) => {
    if (isPlateau(c.player)) {
      result.push({ kind: 'PLATEAU', tone: 'info', text: `${c.player.name} potansiyeline ulaştı (${c.player.overall}/${c.player.potential}).` })
    }
  })
  input.diffRows.filter((r) => r.kind === 'CHANGED' && (r.overallTo ?? 0) < (r.overallFrom ?? 0)).forEach((r) => {
    const player = input.squad.find((c) => c.player.id === r.playerId)
    if (player && (player.player.age ?? 0) >= 30) {
      result.push({ kind: 'AGE', tone: 'warn', text: `${r.name} (${player.player.age}) düşüşte: ${r.overallFrom} → ${r.overallTo}.` })
    }
  })
  depthRows(input.squad).filter((d) => d.short > 0).forEach((d) => result.push({ kind: 'DEPTH', tone: 'warn', text: `${GROUP_LABEL[d.group]} derinliği ${d.have}/${d.need}.` }))
  if (input.windowEndsOn) {
    const left = input.gameDate ? windowDaysLeft(input.windowEndsOn, input.gameDate)! : Math.ceil((new Date(input.windowEndsOn).getTime() - (input.today ?? new Date()).getTime()) / 86_400_000)
    if (left >= 0 && left <= WINDOW_ALERT_DAYS) {
      result.push({ kind: 'WINDOW', tone: 'warn', text: `Transfer dönemi ${left} gün içinde kapanıyor.` })
    }
  }
  return result
}
