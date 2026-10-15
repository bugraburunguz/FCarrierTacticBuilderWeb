import type { FeasibilityBucket } from '../../api/types'
import { Chip } from '../../design/components/primitives'
import { BUCKETS } from './careerFilters'

const DOT = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' } as const

/** Kova çipi: nötr çip + renkli nokta (açık temada tonlu çip zemini cam üstünde 4.5:1'in altına düşüyor; anlam metinde). Liste ve oyuncu sayfası ortak. */
export function BucketChip({ bucket: id }: { bucket?: FeasibilityBucket }) {
  const bucket = BUCKETS.find((b) => b.id === id)
  return bucket ? (
    <Chip>
      <span aria-hidden="true" className={`size-2 rounded-full ${DOT[bucket.tone]}`} />
      {bucket.label}
    </Chip>
  ) : <span className="text-ink-2">–</span>
}
