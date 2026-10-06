const SPOTS: Record<string, [number, number]> = {
  GK: [50, 93],
  LB: [12, 74],
  CB: [50, 80],
  RB: [88, 74],
  CDM: [50, 63],
  CM: [50, 50],
  LM: [12, 45],
  RM: [88, 45],
  CAM: [50, 35],
  LW: [15, 24],
  RW: [85, 24],
  ST: [50, 13],
}

const GOOD_GAP = 3
const OK_GAP = 8

interface Props {
  overalls: Record<string, number>
  listed: string[]
}

export function PositionOverallPitch({ overalls, listed }: Props) {
  const best = Math.max(...Object.values(overalls))
  return (
    <div>
      <svg viewBox="0 0 100 106" role="img" aria-label="Mevkiye göre overall" className="w-full rounded-xl bg-pitch shadow-inner">
        <g stroke="#ffffff55" strokeWidth="0.4" fill="none">
          <rect x="3" y="3" width="94" height="100" />
          <line x1="3" y1="53" x2="97" y2="53" />
          <circle cx="50" cy="53" r="9" />
          <rect x="26" y="3" width="48" height="16" />
          <rect x="26" y="87" width="48" height="16" />
        </g>
        {Object.entries(overalls).map(([position, value]) => {
          const [x, y] = SPOTS[position] ?? [50, 50]
          const gap = best - value
          const fill = gap <= GOOD_GAP ? '#16a34a' : gap <= OK_GAP ? '#d97706' : '#dc2626'
          const isListed = listed.includes(position)
          return (
            <g key={position} transform={`translate(${x} ${y})`}>
              <circle r="5.6" fill={fill} stroke={isListed ? '#fde047' : '#ffffffaa'} strokeWidth={isListed ? 1.4 : 0.5} />
              <text textAnchor="middle" y="1.6" fontSize="5" fontWeight="800" fill="#fff">
                {value}
              </text>
              <text textAnchor="middle" y="10" fontSize="2.8" fill="#fff" stroke="#00000077" strokeWidth="0.5" paintOrder="stroke">
                {position}
                {value === best ? ' ★' : ''}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-slate-500">
        Her mevkideki tahmini overall (oyunun mevki formülüyle). ★ en yüksek, sarı halka oyuncunun listelenen mevkileri; yeşil en iyiye yakın, kırmızı belirgin düşüş.
      </p>
    </div>
  )
}
