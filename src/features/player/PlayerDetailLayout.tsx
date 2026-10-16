import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip, ErrorState, Skeleton } from '../../design/components/primitives'

/**
 * Oyuncu Detay şablonunun ortak bileşenleri (UT oyuncu sayfası V3-05b, kariyer oyuncu sayfası V3-06b): geri bağlantısı, başlık,
 * solda yapışkan kart bölümü, kart altı bilgi ızgarası, sağda sekme yüzeyi. Sekme/adres ve ölçüler `playerPage.ts`'te.
 */

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-accent max-sm:min-h-11">
      <ChevronLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  )
}

/** Hata ve yükleniyor durumları (aynı iskelet). */
export function PlayerPageError({ back, onRetry }: { back: ReactNode; onRetry: () => void }) {
  return <div className="mx-auto flex max-w-[1280px] flex-col gap-3 py-2">{back}<ErrorState message="Bu oyuncu bulunamadı." onRetry={onRetry} /></div>
}

export function PlayerPageLoading({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-3 py-2" aria-busy="true" aria-label="Yükleniyor">
      {back}
      <Skeleton className="h-9 w-72" />
      <div className="flex flex-col gap-4 min-[820px]:flex-row"><Skeleton className="h-[420px] min-[820px]:w-[340px]" /><Skeleton className="h-[420px] flex-1" /></div>
    </div>
  )
}

/**
 * Sayfa iskeleti: üst satırda geri bağlantısı (mobilde yanında `topAside`, ör. Karşılaştır — sekme çubuğu ilk ekranda kalsın), başlık
 * (mevki çipleri + meta + rozetler), altında solda kart bölümü, sağda sekmeler.
 */
export function PlayerDetailLayout({ back, topAside, title, positions, meta, badges, card, children }: {
  back: ReactNode
  topAside?: ReactNode
  title: string
  positions?: string[]
  meta: string
  badges?: ReactNode
  card: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      {/* Mobilde Karşılaştır geri bağlantısının satırında: sekme çubuğu en uzun meta satırıyla da ilk ekranda kalsın (375×812, ≤ 640px). */}
      <div className="flex items-center justify-between gap-2">
        {back}
        {topAside}
      </div>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">{title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2 sm:text-sm">
          {badges}
          {positions?.map((p) => <Chip key={p}>{p}</Chip>)}
          {meta}
        </p>
      </header>
      <div className="flex flex-col gap-3 min-[820px]:flex-row min-[820px]:items-start min-[820px]:gap-4">
        <section aria-label="Kart" className="glass flex flex-col items-center gap-2 p-3 min-[820px]:sticky min-[820px]:top-[var(--header-h)] min-[820px]:w-[340px] min-[820px]:shrink-0 min-[820px]:gap-3 min-[820px]:p-4">
          {card}
        </section>
        <section aria-label="Oyuncu bilgisi" className="glass-2 flex min-w-0 flex-1 flex-col gap-3 p-3 min-[820px]:p-4">
          {children}
        </section>
      </div>
    </div>
  )
}

/** Kart altı bilgi ızgarası (3 sütun): mobilde terim ve değer aynı satırda, masaüstünde alt alta. */
export function FactGrid({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <dl className="grid w-full grid-cols-3 gap-1.5 text-center text-xs min-[820px]:gap-2">
      {facts.map(([term, value]) => (
        <div key={term} className="glass-3 flex items-center justify-center gap-x-1.5 flex-wrap px-1.5 py-1 min-[360px]:flex-nowrap min-[360px]:whitespace-nowrap min-[820px]:flex-col min-[820px]:gap-0 min-[820px]:p-2">
          <dt className="text-muted">{term}</dt>
          <dd className="text-sm font-medium min-[820px]:text-base">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
