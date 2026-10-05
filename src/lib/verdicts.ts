import type { CareerPlayer, SquadFit } from '../api/types'

export type Verdict = 'KEEP' | 'DEVELOP' | 'LOAN' | 'SELL'

export interface PlayerVerdict {
  playerId: number
  name: string
  verdict: Verdict
  reason: string
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  KEEP: 'Tut',
  DEVELOP: 'Geliştir',
  LOAN: 'Kirala',
  SELL: 'Sat',
}

const YOUNG_AGE = 21
const PROSPECT_AGE = 24
const VETERAN_AGE = 30
const BIG_GAP = 6
const SMALL_GAP = 4
const STARTER_GAP_TO_PLAY = 5
const TIGHT_BUDGET = 5_000_000

function age(entry: CareerPlayer): number | undefined {
  return entry.player.age
}

function gap(entry: CareerPlayer): number {
  return (entry.dynamicPotential ?? entry.player.potential ?? entry.player.overall) - entry.player.overall
}

export function computeVerdicts(squad: CareerPlayer[], fit: SquadFit, budgetEur?: number): PlayerVerdict[] {
  const starters = new Set(fit.slots.map((s) => s.playerId).filter((id): id is number => id !== undefined))
  const coverage = new Map<number, number>()
  fit.slots.forEach((slot) => {
    slot.depth.forEach((d, index) => {
      if (index === 0 && !coverage.has(d.playerId)) {
        coverage.set(d.playerId, d.roleFitScore)
      }
    })
  })
  const lowestStarter = Math.min(...squad.filter((s) => starters.has(s.player.id)).map((s) => s.player.overall), 99)
  const tightBudget = budgetEur !== undefined && budgetEur < TIGHT_BUDGET

  return squad.map((entry) => {
    const id = entry.player.id
    const base = { playerId: id, name: entry.player.name }
    const years = age(entry)
    if (starters.has(id)) {
      const slot = fit.slots.find((s) => s.playerId === id)
      return { ...base, verdict: 'KEEP', reason: `${slot?.slotId ?? 'İlk 11'} slotunda ilk 11’de; taktiğin omurgası.` }
    }
    if (coverage.has(id)) {
      if (years !== undefined && years >= VETERAN_AGE && !tightBudget && entry.player.overall < lowestStarter - STARTER_GAP_TO_PLAY) {
        return { ...base, verdict: 'SELL', reason: `${years} yaşında, ilk 11’in ${STARTER_GAP_TO_PLAY}+ puan altında; yedek rolü için yeterince değerli değil.` }
      }
      return { ...base, verdict: 'KEEP', reason: 'Taktikte bir slotun ilk yedeği; rotasyon için gerekli.' }
    }
    if (years !== undefined && years <= YOUNG_AGE && gap(entry) >= BIG_GAP) {
      return entry.player.overall >= lowestStarter - STARTER_GAP_TO_PLAY
        ? { ...base, verdict: 'DEVELOP', reason: `${years} yaşında, potansiyeli +${gap(entry)}; seviyesi ilk 11’e yakın, kadroda geliştir.` }
        : { ...base, verdict: 'LOAN', reason: `${years} yaşında, potansiyeli +${gap(entry)} ama süre bulamaz; kiralık gönderip forma süresi kazandır.` }
    }
    if (years !== undefined && years <= PROSPECT_AGE && gap(entry) >= SMALL_GAP) {
      return { ...base, verdict: 'LOAN', reason: `${years} yaşında, potansiyeli +${gap(entry)}; planda yeri yok, kiralık gönder ya da gelişince değerlendir.` }
    }
    return {
      ...base,
      verdict: 'SELL',
      reason: tightBudget
        ? 'Taktikte yeri ya da yedek rolü yok ve bütçe dar; satışla bütçe aç.'
        : 'Taktikte yeri ya da yedek rolü yok, gelişim potansiyeli de sınırlı; satışa uygun.',
    }
  })
}
