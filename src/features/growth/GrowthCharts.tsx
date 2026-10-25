import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { HistorySeries } from './growthData'

/**
 * Gelişim grafiği (V3-06e; ACADEMY-b'den beri oyuncu sayfasının Gelişim sekmesinde): paket yok, kendi SVG'miz; lazy yüklenir. viewBox kabın gerçek genişliğinden kurulur (1 birim = 1 px) → yazılar
 * ölçeklenmez, 375px'te de ≥ 12px. Erişilebilirlik: svg role="img" + özet etiket; her grafikte "Tablo olarak göster" aynı veriyi tablo yapar.
 * Renkler 11 §3 token'ları: OVR --accent (düz), POT --ink-2 (kesikli), ızgara --glass-border, yazı --ink-2; yükselen --good, düşen --bad.
 */

const FONT = 12
const DEFAULT_WIDTH = 640
/** x etiketleri arasında en az bu kadar px (tarih etiketi ≈ 70px): son etikete yakın ara etiket çizilmez. */
const LABEL_GAP = 84

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

/** Grafik ↔ tablo anahtarı (aynı veri). */
function ChartFrame({ chart, table }: { chart: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div>
        <button type="button" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}
          className="inline-flex min-h-8 items-center rounded-[var(--radius-sm)] px-2 text-sm font-semibold text-accent hover:bg-[var(--glass-hover)] max-sm:min-h-11">
          {asTable ? 'Grafik olarak göster' : 'Tablo olarak göster'}
        </button>
      </div>
      {asTable ? <div className="overflow-x-auto">{table}</div> : chart}
    </div>
  )
}

/** OVR (düz) ve POT (kesikli) zaman serisi; noktalarda tooltip (tarih/sıra, OVR, POT), klavyeyle de odaklanır. */
export function HistoryChart({ series }: { series: HistorySeries }) {
  const { ref, width } = useWidth()
  const [hover, setHover] = useState<number>()
  const { points } = series
  const height = 240
  const pad = { left: 40, right: 16, top: 16, bottom: 44 }
  const values = points.flatMap((p) => [p.ovr, p.pot])
  const lo = Math.floor((Math.min(...values) - 2) / 5) * 5
  const hi = Math.ceil((Math.max(...values) + 2) / 5) * 5
  const xs = points.map((p) => p.x)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const sx = (x: number) => pad.left + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (width - pad.left - pad.right)
  const sy = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * (height - pad.top - pad.bottom)
  const path = (pick: (p: (typeof points)[number]) => number) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(pick(p)).toFixed(1)}`).join(' ')
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5)
  // Etiketler çakışmasın: genişliğe sığan sayıda x etiketi (ilk ve son her zaman).
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor((width - pad.left) / LABEL_GAP))))
  const first = points[0]
  const last = points[points.length - 1]
  const summary = `OVR ${first.ovr} → ${last.ovr}, POT ${last.pot}; ${points.length} içe aktarma, ${series.axis === 'gameDate' ? 'oyun tarihine göre' : 'içe aktarma sırasına göre'}`
  const active = hover === undefined ? undefined : points[hover]

  const chart = (
    <div ref={ref} className="relative w-full">
      <svg role="img" aria-label={summary} viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block max-w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke="var(--glass-border)" />
            <text x={pad.left - 6} y={sy(t) + 4} textAnchor="end" fontSize={FONT} fill="var(--ink-2)">{t}</text>
          </g>
        ))}
        {points.map((p, i) => (i === points.length - 1 || (i % every === 0 && sx(points[points.length - 1].x) - sx(p.x) >= LABEL_GAP)) && (
          <text key={`x${p.snapshotId}`} x={sx(p.x)} y={height - pad.bottom + 18} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize={FONT} fill="var(--ink-2)">{p.label}</text>
        ))}
        <text x={(pad.left + width - pad.right) / 2} y={height - 6} textAnchor="middle" fontSize={FONT} fill="var(--ink-2)">{series.axisTitle}</text>
        <path d={path((p) => p.pot)} fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="6 5" />
        <path d={path((p) => p.ovr)} fill="none" stroke="var(--accent)" strokeWidth={3} />
        {points.map((p, i) => (
          <circle key={p.snapshotId} cx={sx(p.x)} cy={sy(p.ovr)} r={hover === i ? 7 : 5} fill="var(--accent)" stroke="var(--sheet-bg)" strokeWidth={2} tabIndex={0}
            aria-label={`${p.label}: OVR ${p.ovr}, POT ${p.pot}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(undefined)} onFocus={() => setHover(i)} onBlur={() => setHover(undefined)}>
            <title>{`${p.label}: OVR ${p.ovr}, POT ${p.pot}`}</title>
          </circle>
        ))}
      </svg>
      {active && (
        <div role="tooltip" className="glass-3 pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap px-2 py-1 text-xs text-ink"
          style={{ left: Math.min(Math.max(sx(active.x), 70), width - 70), top: sy(active.ovr) - 10 }}>
          <b>{active.label}</b> · OVR {active.ovr} · POT {active.pot}
        </div>
      )}
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[var(--accent)]" />OVR</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-[var(--ink-2)]" />POT</span>
      </p>
    </div>
  )
  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">OVR ve POT geçmişi ({series.axisTitle.toLocaleLowerCase('tr-TR')})</caption>
      <thead className="text-xs text-muted"><tr><th scope="col" className="py-1 text-left font-medium">{series.axisTitle}</th><th scope="col" className="py-1 text-right font-medium">OVR</th><th scope="col" className="py-1 text-right font-medium">POT</th></tr></thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.snapshotId} className="border-t border-[var(--glass-border)]"><td className="py-1">{p.label}</td><td className="py-1 text-right tabular-nums">{p.ovr}</td><td className="py-1 text-right tabular-nums">{p.pot}</td></tr>
        ))}
      </tbody>
    </table>
  )
  return <ChartFrame chart={chart} table={table} />
}
