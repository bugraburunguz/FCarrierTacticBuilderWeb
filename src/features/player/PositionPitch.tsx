/** Mevkinin sahadaki yeri (% sol, % üst); bilinmeyen mevki orta sahaya. */
const SPOTS: Record<string, [number, number]> = {
  GK: [50, 92], LB: [13, 73], LWB: [13, 62], CB: [50, 79], RB: [87, 73], RWB: [87, 62],
  CDM: [50, 64], CM: [50, 51], LM: [13, 45], RM: [87, 45], CAM: [50, 37],
  LW: [16, 24], RW: [84, 24], CF: [50, 22], ST: [50, 11],
}

const GOOD_GAP = 3
const OK_GAP = 8
type Gap = 'best' | 'good' | 'ok' | 'far'
const GAP_CLASS: Record<Gap, string> = {
  best: 'bg-[var(--good)]', good: 'bg-[var(--good)]', ok: 'bg-[var(--warn)]', far: 'bg-[var(--bad)]',
}

/**
 * FCA-4d (Stitch oyuncu profili): mevkiye göre tahmini OVR sahada. Kutu rengi en iyi mevkiye uzaklık (≤3 yeşil, ≤8 amber, üstü kırmızı);
 * renk tek başına anlam taşımaz — her kutu değeri ve mevkiyi yazar, erişilebilir ad "ST: OVR 72, en yüksek, listelenen mevki".
 * Listelenen mevkiler açık halkalı. Saha kariyer token'larıyla (UT'nin v2 SVG sahası değişmez).
 */
export function PositionPitch({ overalls, listed }: { overalls: Record<string, number>; listed: string[] }) {
  const entries = Object.entries(overalls).sort((a, b) => b[1] - a[1])
  const best = entries[0]?.[1] ?? 0
  const gapOf = (value: number): Gap => (value === best ? 'best' : best - value <= GOOD_GAP ? 'good' : best - value <= OK_GAP ? 'ok' : 'far')
  return (
    <section aria-labelledby="position-pitch-title" className="flex flex-col gap-2">
      <h2 id="position-pitch-title" className="panel-title font-display text-lg font-semibold leading-6">Mevkiye göre OVR</h2>
      <div className="relative mx-auto aspect-[100/106] w-full max-w-[420px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[var(--pitch-1)]">
        {/* Saha çizgileri (dekoratif) */}
        <div aria-hidden="true" className="absolute inset-[3%] border border-[var(--pitch-line)]" />
        <div aria-hidden="true" className="absolute inset-x-[3%] top-1/2 border-t border-[var(--pitch-line)]" />
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--pitch-line)]" />
        <div aria-hidden="true" className="absolute left-[26%] right-[26%] top-[3%] h-[15%] border border-t-0 border-[var(--pitch-line)]" />
        <div aria-hidden="true" className="absolute bottom-[3%] left-[26%] right-[26%] h-[15%] border border-b-0 border-[var(--pitch-line)]" />
        <ul aria-label="Mevkiye göre OVR" className="absolute inset-0">
          {entries.map(([position, value]) => {
            const [x, y] = SPOTS[position] ?? [50, 50]
            const gap = gapOf(value)
            const isListed = listed.includes(position)
            const name = [`${position}: OVR ${value}`, gap === 'best' ? 'en yüksek' : undefined, isListed ? 'listelenen mevki' : undefined].filter(Boolean).join(', ')
            return (
              <li key={position} aria-label={name} data-gap={gap} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${x}%`, top: `${y}%` }}>
                <span className={`grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] font-display text-lg font-bold tabular-nums text-[var(--accent-ink)] ${GAP_CLASS[gap]} ${isListed ? 'ring-2 ring-[var(--ink)]' : ''}`}>
                  {value}
                </span>
                <span className="rounded-sm bg-[var(--pawn-label-bg)] px-1 text-xs font-semibold leading-4 text-[var(--pawn-label-ink)]">{position}{gap === 'best' ? ' ▲' : ''}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="text-xs text-ink-2">Tahmini OVR (oyunun mevki formülü). ▲ en yüksek; açık halka listelenen mevkiler; yeşil en iyiye yakın (≤3), amber ≤8, kırmızı belirgin düşüş.</p>
    </section>
  )
}
