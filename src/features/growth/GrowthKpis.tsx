import { ArrowDown, ArrowUp, ClipboardList, Hourglass, type LucideIcon } from 'lucide-react'
import type { AcademyPlayer, GrowthRecent } from '../../api/types'

function Tile({ label, count, sub, Icon, tone }: { label: string; count: number; sub?: string; Icon: LucideIcon; tone: string }) {
  return (
    <div aria-label={`${label}: ${count} oyuncu`} className="glass flex min-w-0 items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[28px] font-bold leading-7 tabular-nums text-ink">{count}</span>
          <span className="text-xs text-ink-2">oyuncu</span>
        </span>
        {sub && <span className="text-xs text-ink-2">{sub}</span>}
      </div>
      <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-[var(--glass-3)] ${tone}`}><Icon size={18} /></span>
    </div>
  )
}

/**
 * FCA-4b Gelişim özeti (Stitch üst kartlar), yalnız eldeki veriden: son N ayda OVR'ı yükselen / düşen kadro oyuncusu (GTR anlık görüntüleri;
 * önceki görüntü yoksa 0), özel plan önerilen (Dengeli dışı, tahmin) ve 30+ yaş (düşüşü yavaşlatma).
 */
export function GrowthKpis({ players, recent }: { players: AcademyPlayer[]; recent: GrowthRecent[] }) {
  const months = recent.length ? Math.max(...recent.map((r) => r.months)) : undefined
  const span = months ? `son ${months} ayda` : 'önceki görüntü yok'
  return (
    <section aria-label="Gelişim özeti" className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
      <Tile label="Yükselen" count={recent.filter((r) => r.overallDelta > 0).length} sub={span} Icon={ArrowUp} tone="text-good" />
      <Tile label="Düşen" count={recent.filter((r) => r.overallDelta < 0).length} sub={span} Icon={ArrowDown} tone="text-bad" />
      <Tile label="Özel plan" count={players.filter((p) => p.plan && !p.plan.balanced).length} sub="Dengeli dışı öneri · tahmin" Icon={ClipboardList} tone="text-accent" />
      <Tile label="Tecrübeli (30+)" count={players.filter((p) => p.ageGroup === 'VETERAN').length} sub="düşüşü yavaşlatma" Icon={Hourglass} tone="text-warn" />
    </section>
  )
}
