import { useQuery } from '@tanstack/react-query'
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { MatchRating } from '../../api/types'
import { formatRating, ratingBarClass } from '../../components/MatchRatings'
import { EmptyState, Skeleton } from '../../design/components/primitives'
import { competitionName, formatAverageRating, matchPositionLabel, oldestFirst } from '../../lib/matchData'

const STALE_MS = 120_000
const DAY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const SHORT = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const asDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`)

/**
 * FCA-22 kariyer oyuncu sayfası "Maçlar" sekmesi: kayıttan biriken maç notları (en yeni sağda) ve turnuva bazında sezon tablosu.
 * Uç yoksa ya da hata verirse (eski backend) sessizce boş durum; sayfa çökmez.
 */
export function MatchesTab({ careerId, playerId }: { careerId: number; playerId: number }) {
  const matches = useQuery({ queryKey: ['career-player-matches', careerId, playerId], queryFn: () => endpoints.playerMatches(careerId, playerId), staleTime: STALE_MS, retry: false })
  if (matches.isPending) {
    return <div className="flex flex-col gap-2"><Skeleton className="h-28" /><Skeleton className="h-24" /></div>
  }
  const ratings = matches.data?.ratings ?? []
  const seasons = matches.data?.seasons ?? []
  if (ratings.length === 0 && seasons.length === 0) {
    return (
      <EmptyState action={<Link to="/career/import" className="inline-flex min-h-10 items-center font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">İçe aktar</Link>}>
        Maç verisi yok. LE 2.0.5 export'unu içe aktar.
      </EmptyState>
    )
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {ratings.length > 0 && <RatingChart ratings={oldestFirst(ratings)} />}
      {seasons.length > 0 && (
        <section aria-labelledby="mac-sezon" className="flex min-w-0 flex-col gap-2">
          <h3 id="mac-sezon" className="panel-title font-display text-lg font-semibold">Sezon</h3>
          {/* Dar ekranda tablo kendi içinde kayar; kayan alan klavyeyle odaklanır. */}
          <div role="region" aria-label="Sezon istatistiği (kaydırılabilir)" tabIndex={0} className="max-w-full overflow-x-auto">
            <table aria-label="Sezon istatistiği" className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th scope="col" className="py-1 pr-2">Turnuva</th>
                  <th scope="col" className="pr-2">Takım</th>
                  <th scope="col" className="pr-2 text-right" title="Maç">M</th>
                  <th scope="col" className="pr-2 text-right" title="Gol">G</th>
                  <th scope="col" className="pr-2 text-right" title="Asist">A</th>
                  <th scope="col" className="pr-2 text-right" title="Ortalama not">Ort.</th>
                  <th scope="col" className="pr-2 text-right" title="Sarı / kırmızı kart">Kart</th>
                  <th scope="col" className="text-right" title="Gol yemeden biten maç">CS</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={`${s.teamId}-${s.competitionId}`} className="border-t border-line">
                    <th scope="row" className="py-1.5 pr-2 font-medium">{competitionName(s.competitionId)}</th>
                    <td className="pr-2 text-ink-2">{s.teamName}</td>
                    <td className="pr-2 text-right tabular-nums">{s.appearances}</td>
                    <td className="pr-2 text-right tabular-nums">{s.goals}</td>
                    <td className="pr-2 text-right tabular-nums">{s.assists}</td>
                    <td className="pr-2 text-right tabular-nums">{formatAverageRating(s.averageRating)}</td>
                    <td className="pr-2 text-right tabular-nums">{`${s.yellowCards} / ${s.redCards}`}</td>
                    <td className="text-right tabular-nums">{s.cleanSheets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

/** Not çubukları: en eskiden en yeniye, yatay kayar; açılışta en yeni (sağ) görünür. Her çubukta not, tarih ve dakika; mevki yalnız biliniyorsa. */
function RatingChart({ ratings }: { ratings: MatchRating[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) {
      el.scrollLeft = el.scrollWidth
    }
  }, [ratings])
  return (
    <section aria-labelledby="mac-notlari" className="flex min-w-0 flex-col gap-2">
      <h3 id="mac-notlari" className="panel-title font-display text-lg font-semibold">Maç notları</h3>
      <div ref={scroller} role="region" aria-label="Maç notları (kaydırılabilir)" tabIndex={0} className="max-w-full overflow-x-auto pb-1">
        <ol aria-label="Maç notları" className="flex min-w-max items-end gap-1">
          {ratings.map((m, i) => {
            const position = matchPositionLabel(m.position)
            const full = `${DAY.format(asDate(m.date))} · ${m.minutes} dk · Not ${formatRating(m.rating)}${position ? ` · Mevki ${position}` : ''}`
            return (
              // relative: sr-only metin (position:absolute) kayan şeridin içinde kalır; yoksa sayfaya göre konumlanıp belgeyi yatay taşırır.
              <li key={`${m.date}-${i}`} title={full} className="relative flex w-11 flex-col items-center gap-1">
                <span className="sr-only">{full}</span>
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums">{formatRating(m.rating)}</span>
                <span aria-hidden="true" className="flex h-20 w-6 items-end rounded-[var(--radius-sm)] bg-[var(--glass-3)]">
                  <span data-rating-bar className={`block w-full rounded-[var(--radius-sm)] ${ratingBarClass(m.rating)}`} style={{ height: `${Math.max(0, Math.min(10, m.rating)) * 10}%` }} />
                </span>
                <span aria-hidden="true" className="text-xs leading-4 text-muted">{SHORT.format(asDate(m.date))}</span>
                <span aria-hidden="true" className="text-xs leading-4 text-muted tabular-nums">{m.minutes}&apos;</span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
