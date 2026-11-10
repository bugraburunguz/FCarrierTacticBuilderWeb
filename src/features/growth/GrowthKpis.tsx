import { ArrowDown, ArrowUp, ClipboardList, Hourglass, type LucideIcon } from 'lucide-react'
import type { AcademyPlayer, GrowthRecent } from '../../api/types'
import { Skeleton } from '../../design/components/primitives'

type RecentState = 'loading' | 'error' | 'ready'

function Tile({ label, count, sub, Icon, tone, state = 'ready' }: { label: string; count: number; sub?: string; Icon: LucideIcon; tone: string; state?: RecentState }) {
  const name = state === 'error' ? `${label}: veri alınamadı` : state === 'loading' ? `${label}: yükleniyor` : `${label}: ${count} oyuncu`
  return (
    // role="group": adı olan kutu (rolsüz div'e ad verilmez).
    <div role="group" aria-label={name} className="glass flex min-w-0 items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
        {state === 'loading' ? <Skeleton className="h-7 w-16" /> : (
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[28px] font-bold leading-7 tabular-nums text-ink">{state === 'error' ? '–' : count}</span>
            {state === 'ready' && <span className="text-xs text-ink-2">oyuncu</span>}
          </span>
        )}
        {sub && <span className="text-xs text-ink-2">{state === 'error' ? 'veri alınamadı' : sub}</span>}
      </div>
      <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-[var(--glass-3)] ${tone}`}><Icon size={18} /></span>
    </div>
  )
}

/**
 * FCA-4b Gelişim özeti (Stitch üst kartlar), yalnız eldeki veriden: son N ayda OVR'ı yükselen / düşen (GTR anlık görüntüleri; yalnız listedeki oyuncular —
 * growth-recent kiralıktaki yetişkinleri de döner), özel plan önerilen (Dengeli dışı, tahmin) ve 30+ yaş. Uç yüklenirken iskelet, hata verirse "–".
 */
export function GrowthKpis({ players, recent, recentState }: { players: AcademyPlayer[]; recent: GrowthRecent[]; recentState: RecentState }) {
  const ids = new Set(players.map((p) => p.playerId))
  const listed = recent.filter((r) => ids.has(r.playerId))
  const months = listed.length ? Math.max(...listed.map((r) => r.months)) : undefined
  const span = months ? `son ${months} ayda` : 'önceki görüntü yok'
  return (
    <section aria-label="Gelişim özeti" className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
      <Tile label="Yükselen" count={listed.filter((r) => r.overallDelta > 0).length} sub={span} Icon={ArrowUp} tone="text-good" state={recentState} />
      <Tile label="Düşen" count={listed.filter((r) => r.overallDelta < 0).length} sub={span} Icon={ArrowDown} tone="text-bad" state={recentState} />
      <Tile label="Özel plan" count={players.filter((p) => p.plan && !p.plan.balanced).length} sub="Dengeli dışı öneri · tahmin" Icon={ClipboardList} tone="text-accent" />
      <Tile label="Tecrübeli (30+)" count={players.filter((p) => p.ageGroup === 'VETERAN').length} sub="düşüşü yavaşlatma" Icon={Hourglass} tone="text-warn" />
    </section>
  )
}
