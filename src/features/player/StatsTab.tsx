import type { PlayerDetail } from '../../api/types'
import { AttributeRadar } from '../../components/AttributeRadar'
import { Chip } from '../../design/components/primitives'
import { ATTR_GROUPS, ATTR_LABELS } from '../../lib/format'
import { playStyleName } from '../../lib/playstyles'
import { TONE_VAR, ratingTone } from '../../lib/ratingTone'

/**
 * Statlar: 6 grup attribute tablosu (ratingTone ile renkli), PlayStyle'lar; kaleci için yalnız kaleci grubu. UT ve kariyer oyuncu sayfası ortak.
 * note: değerlerin hangi karta ait olduğuna dair kısa not (UT'de base dışı versiyon).
 * profile (KARIYER-UX 6, kariyer oyuncu sayfası): grupların üstünde Karşılaştır'daki profil radarı (aynı bileşen, metin tablosuyla).
 */
export function StatsTab({ detail, note, profile = false }: { detail: PlayerDetail; note?: string; profile?: boolean }) {
  const { attrs, playstyles, summary } = detail
  const goalkeeper = summary.positions.includes('GK')
  const groups = ATTR_GROUPS.filter((g) => (g.title === 'Kaleci') === goalkeeper || (g.title !== 'Kaleci' && !goalkeeper))
  return (
    <div className="flex flex-col gap-4">
      {note && <p className="text-xs text-muted">{note}</p>}
      {profile && (
        <section aria-label="Profil" className="glass-3 rounded-[var(--radius-sm)] p-3">
          <AttributeRadar series={[{ name: summary.name, attrs }]} goalkeeper={goalkeeper} />
        </section>
      )}
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="mb-1 font-display text-lg font-semibold leading-6">{g.title}</h2>
          <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {g.attrs.map((a) => {
              const value = attrs[a] ?? 0
              return (
                <div key={a} className="flex items-center gap-2 border-b border-[var(--glass-border)] py-1 text-sm">
                  <dt className="w-32 shrink-0 break-words leading-tight text-ink-2">{ATTR_LABELS[a] ?? a}</dt>
                  <dd className="flex min-w-0 flex-1 items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--glass-3)]"><span className="block h-full rounded-full" style={{ width: `${value}%`, background: TONE_VAR[ratingTone(value)] }} /></span>
                    <span className="min-w-7 text-right font-[var(--font-num)] font-medium tabular-nums text-ink">{value}</span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
      {Object.keys(playstyles).length > 0 && (
        <section aria-label="PlayStyle">
          <h2 className="mb-1 font-display text-lg font-semibold leading-6">PlayStyle</h2>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(playstyles).map(([ps, level]) => (
              <Chip key={ps} tone={level >= 2 ? 'warn' : undefined}>{playStyleName(ps, level)}</Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
