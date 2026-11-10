import type { CareerPlayer } from '../api/types'
import type { SellAdvice } from './deskRules'

export type SquadRowStatus = 'loaned-out' | 'on-loan' | 'sell' | 'minutes'

export interface SquadRowStatusView {
  status: SquadRowStatus
  /** Solda 3 px şerit (td sınıfı). */
  stripe: string
  tone: 'info' | 'bad' | 'warn'
  label: string
  shortLabel: string
  title?: string
}

/**
 * FCA-3 (Stitch) kadro satırı durumu: kayıttaki kiralık önce (mavi), sonra Masa önerisi — Sat (kırmızı), Süre ver (amber). Renk tek başına
 * anlam taşımaz: çip metni her zaman var, öneride gerekçe `title`.
 */
export function squadRowStatus(entry: CareerPlayer, advice?: SellAdvice): SquadRowStatusView | undefined {
  if (entry.loanedOut) {
    return { status: 'loaned-out', stripe: 'pl-2 shadow-[inset_3px_0_0_var(--info)]', tone: 'info', label: 'Kiralıkta (başka takımda)', shortLabel: 'Kiralıkta' }
  }
  if (entry.onLoan) {
    return { status: 'on-loan', stripe: 'pl-2 shadow-[inset_3px_0_0_var(--info)]', tone: 'info', label: 'Kiralık (bizde)', shortLabel: 'Kiralık' }
  }
  if (advice?.kind === 'SELL') {
    return { status: 'sell', stripe: 'pl-2 shadow-[inset_3px_0_0_var(--bad)]', tone: 'bad', label: 'Sat', shortLabel: 'Sat', title: advice.reason }
  }
  if (advice?.kind === 'LOAN') {
    return { status: 'minutes', stripe: 'pl-2 shadow-[inset_3px_0_0_var(--warn)]', tone: 'warn', label: 'Süre ver', shortLabel: 'Süre ver', title: advice.reason }
  }
  return undefined
}
