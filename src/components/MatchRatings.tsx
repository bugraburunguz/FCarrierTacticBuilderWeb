import { oldestFirst, ratingTone, type RatingTone } from '../lib/matchData'

const TONE: Record<RatingTone, string> = {
  good: 'bg-[var(--good-soft)] text-good',
  info: 'bg-[var(--info-soft)] text-info',
  warn: 'bg-[var(--warn-soft)] text-warn',
  bad: 'bg-[var(--bad-soft)] text-bad',
}

export const ratingToneClass = (rating: number) => TONE[ratingTone(rating)]

/** FCA-23: grafik çubuğu dolu ton rengiyle (yumuşak zemin koyu temada soluk kalıyordu); üstündeki sayı ayrıca yazılır. */
const BAR: Record<RatingTone, string> = { good: 'bg-good', info: 'bg-info', warn: 'bg-warn', bad: 'bg-bad' }

export const ratingBarClass = (rating: number) => BAR[ratingTone(rating)]

export const formatRating = (rating: number) => String(rating).replace('.', ',')

/** FCA-22: son maç notları küçük renkli rozetler; sunucu en yeniyi önce verir, en yeni sağda çizilir. Renk sayıyla birlikte. */
export function LastRatings({ newestFirst, label = 'Son 5 maç notu' }: { newestFirst: readonly number[]; label?: string }) {
  if (newestFirst.length === 0) {
    return <span className="text-muted">—</span>
  }
  return (
    <ol aria-label={label} className="flex gap-0.5">
      {oldestFirst(newestFirst).map((rating, i) => (
        <li key={i} className={`grid h-5 min-w-5 place-items-center rounded-[var(--radius-sm)] px-0.5 text-xs font-semibold tabular-nums ${ratingToneClass(rating)}`}>
          {formatRating(rating)}
        </li>
      ))}
    </ol>
  )
}
