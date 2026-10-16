import { radarAxes, radarValues } from '../lib/radar'

export interface RadarSeries {
  name: string
  attrs: Record<string, number>
}

// Renk + çizgi deseni birlikte kullanılır (renk körü güvenli).
const STYLES = [
  { color: 'var(--series-1)', dash: undefined },
  { color: 'var(--series-2)', dash: '6 3' },
  { color: 'var(--series-3)', dash: '2 3' },
  { color: 'var(--series-4)', dash: '8 3 2 3' },
  { color: 'var(--series-5)', dash: '12 4' },
  { color: 'var(--series-6)', dash: '1 3' },
]

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = 92
const RINGS = [25, 50, 75, 100]

function point(index: number, count: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const r = (RADIUS * value) / 100
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

export function AttributeRadar({ series, goalkeeper }: { series: RadarSeries[]; goalkeeper: boolean }) {
  const axes = radarAxes(goalkeeper)
  const rows = series.map((s) => radarValues(s.attrs, goalkeeper))

  return (
    <figure className="mx-auto w-full max-w-sm">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Profil radarı: ${series.map((s) => s.name).join(', ')}`} className="w-full">
        <g fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1">
          {RINGS.map((ring) => (
            <polygon key={ring} points={axes.map((_, i) => point(i, axes.length, ring).join(',')).join(' ')} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = point(i, axes.length, 100)
            return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} />
          })}
        </g>
        {rows.map((values, s) => (
          <polygon
            key={series[s].name}
            points={values.map((v, i) => point(i, axes.length, v).join(',')).join(' ')}
            style={{ fill: STYLES[s % STYLES.length].color, stroke: STYLES[s % STYLES.length].color }}
            fillOpacity="0.14"
            strokeWidth="2"
            strokeDasharray={STYLES[s % STYLES.length].dash}
            strokeLinejoin="round"
          />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, axes.length, 119)
          return (
            <text key={axis.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="currentColor" fillOpacity="0.75">
              {axis.label}
            </text>
          )
        })}
      </svg>
      {series.length > 1 && (
        <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-1">
              <svg width="22" height="8" aria-hidden>
                <line x1="0" y1="4" x2="22" y2="4" style={{ stroke: STYLES[i % STYLES.length].color }} strokeWidth="2" strokeDasharray={STYLES[i % STYLES.length].dash} />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {/* sr-only kapta: tablo yerleşimi 1px genişliği yok sayıp sayfayı yatay taşırıyordu (V3-07c, 375). */}
      <div className="sr-only">
      <table>
        <caption>Profil değerleri</caption>
        <thead>
          <tr>
            <th scope="col">Oyuncu</th>
            {axes.map((a) => (
              <th key={a.label} scope="col">{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s, i) => (
            <tr key={s.name}>
              <th scope="row">{s.name}</th>
              {rows[i].map((v, j) => (
                <td key={axes[j].label}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
