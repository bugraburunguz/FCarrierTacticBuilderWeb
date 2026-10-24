import type { ReactNode } from 'react'
import { formatEur } from '../../lib/format'
import type { BudgetPlan, WageImpact } from './transferPlan'

const NUM = 'font-[var(--font-num)] tabular-nums'
const WAGE_MISSING = 'maaş verisi içe aktarmada gelmiyor'

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'border-t border-[var(--glass-border)] pt-2' : ''}`}>
      <dt className={strong ? 'font-semibold text-ink' : 'text-ink-2'}>{label}</dt>
      <dd className={`${NUM} ${strong ? 'text-lg font-semibold text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

const signedEur = (sign: '+' | '−', value: number) => (value === 0 ? formatEur(0) : `${sign}${formatEur(value)}`)

function wageText(wage: WageImpact): { value: string; note?: string } {
  switch (wage.kind) {
    case 'empty':
      return { value: '—', note: 'Kısa liste ve satış planı boş.' }
    case 'unknown':
      return { value: '—', note: `${wage.unknown} oyuncunun maaşı bilinmiyor — ${WAGE_MISSING}` }
    case 'known': {
      const amount = `${wage.deltaEur < 0 ? '−' : wage.deltaEur > 0 ? '+' : ''}${formatEur(Math.abs(wage.deltaEur))} / hafta`
      return { value: wage.share === undefined ? amount : `${amount} · maaş bütçesinin %${Math.round(Math.abs(wage.share) * 100)}` }
    }
  }
}

/**
 * Bütçe planı (KARIYER-UX FAZ 5, 15 §4.4, §5.7): bütçe − kısa liste + satış planı = kalan; maaş etkisi. Bilinmeyen değer "—" ve nedeni yazar
 * (0'a çevrilmez, kısmi maaş toplamı tam toplam gibi gösterilmez). Mobilde (§5.8) üstte katlanır özet şerit: "Kalan €X".
 */
export function BudgetPlanPanel({ plan, budget, mobile }: { plan: BudgetPlan; budget?: number; mobile: boolean }) {
  const wage = wageText(plan.wage)
  const notes = [
    budget === undefined ? 'Bütçe girilmemiş: kariyer ayarlarından gir; kalan hesaplanmaz.' : undefined,
    plan.shortlist.unknown > 0 ? `Kısa listede ${plan.shortlist.unknown} oyuncunun bedeli bilinmiyor (sayılmadı).` : undefined,
    plan.sales.unknown > 0 ? `Satış planında ${plan.sales.unknown} oyuncunun bedeli ve değeri bilinmiyor (sayılmadı).` : undefined,
  ].filter(Boolean)
  const body: ReactNode = (
    <section aria-label="Bütçe planı" className="flex flex-col gap-2 text-sm">
      <dl className="flex flex-col">
        <Line label="Transfer bütçesi" value={budget === undefined ? '—' : formatEur(budget)} />
        <Line label="Kısa liste" value={plan.shortlist.count === 0 ? '—' : signedEur('−', plan.shortlist.total)} />
        <Line label="Satış planı" value={plan.sales.count === 0 ? '—' : signedEur('+', plan.sales.total)} />
        <Line label="Kalan" value={plan.remaining === undefined ? '—' : formatEur(plan.remaining)} strong />
        <Line label="Maaş etkisi" value={wage.value} />
      </dl>
      {wage.note && <p className="text-xs text-ink-2">{wage.note}</p>}
      {notes.map((n) => <p key={n} className="text-xs text-muted">{n}</p>)}
      <p className="text-xs text-muted">Kısa liste: pazarlık tavanı, yoksa piyasa değeri. Satış planı: satışa konanların istenen bedeli, yoksa değeri.</p>
    </section>
  )
  if (mobile) {
    return (
      <details className="glass p-3">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-semibold">
          <span>Bütçe planı</span>
          <span className={NUM}>Kalan {plan.remaining === undefined ? '—' : formatEur(plan.remaining)}</span>
        </summary>
        <div className="pt-2">{body}</div>
      </details>
    )
  }
  return <div className="glass p-4">{body}</div>
}
