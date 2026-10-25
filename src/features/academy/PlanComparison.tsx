import type { YouthDetail } from '../../api/types'

type PlanRow = YouthDetail['advice']['plans'][number]

const SCALE_MIN = 40
const SCALE_MAX = 99
const pct = (value: number) => `${Math.max(0, Math.min(100, ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100))}%`

/**
 * Plan karşılaştırması (ACADEMY-b §2, Altyapı ve Gelişim ortak): Dengeli / en iyi rol planı / dönüşüm planı; her biri hedef mevkide 1 ve 2 sezon sonra
 * tahmini OVR. Yatay çubuk (2 sezon), değerler metinle de yazar. Altında "tahmin · kalibre edilmedi".
 */
export function PlanComparison({ plans }: { plans: PlanRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Plan karşılaştırması" className="flex flex-col gap-2">
        {plans.map((p) => (
          <li key={`${p.kind}-${p.label}`} className="flex flex-col gap-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <b>{p.label}</b>
              <span className="text-xs text-ink-2">{p.position} OVR · 1 sezon {p.overall1} · 2 sezon {p.overall2}</span>
            </span>
            <span aria-hidden="true" className="relative block h-2 w-full overflow-hidden rounded-full bg-[var(--glass-3)]">
              <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--line)]" style={{ width: pct(p.overall2) }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(p.overall1) }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">tahmin · kalibre edilmedi</p>
    </div>
  )
}
