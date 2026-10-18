import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Input } from '../../components/ui'
import { Button, Chip } from '../../design/components/primitives'
import { POSITIONS } from '../../lib/format'
import { useElementSize } from '../cards/cardGrid'

/**
 * Katalog şablonu çerçevesi: başlık + yapışkan opak filtre çubuğu (≥820px, `glass-sticky`). Çubuğun yüksekliği `--filters-h` olarak ölçülür;
 * tablo başlığı (CatalogTable) üst başlık + bu çubuğun hemen altına yapışır.
 */
export function CatalogShell({ title, subtitle, bar, children }: { title: string; subtitle?: ReactNode; bar: ReactNode; children: ReactNode }) {
  const filterBox = useRef<HTMLDivElement>(null)
  const filtersHeight = useElementSize(filterBox).height
  // "Daha fazla filtre" açıkken panel ekranın yarısından uzun: yapışkan kalınca kaydırmada sonuçları örtüyordu. Açıkken sayfayla kayar.
  const [moreOpen, setMoreOpen] = useState(false)
  useEffect(() => {
    const box = filterBox.current
    if (!box) {
      return
    }
    // toggle kabarcıklanmaz: yakalama aşamasında dinlenir; iç içe bölüm (Öznitelik minimumları) de sayılır.
    const onToggle = () => setMoreOpen(Boolean(box.querySelector('details[open]')))
    box.addEventListener('toggle', onToggle, true)
    return () => box.removeEventListener('toggle', onToggle, true)
  }, [])
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 py-2" style={{ '--filters-h': `${moreOpen ? 0 : filtersHeight}px` } as CSSProperties}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">{title}</h1>
        {subtitle}
      </div>
      <div ref={filterBox} className={`z-20 ${moreOpen ? '' : 'min-[820px]:sticky min-[820px]:top-[var(--header-h)]'}`}>
        {/* Yapışkan panel ekrandan uzun olamaz ("Daha fazla filtre" açıkken alt kısmına ulaşılamıyor, sayfayı örtüyordu): içi kayar.
            overscroll-contain YOK: fare paneldeyken sayfa kaydırması panelde takılıyordu (ölçüldü). */}
        <section aria-label="Süzgeçler" className="glass glass-sticky flex flex-col gap-3 p-3 sm:px-4 min-[820px]:max-h-[calc(100dvh-var(--header-h)-6rem)] min-[820px]:overflow-y-auto">
          {bar}
        </section>
      </div>
      {children}
    </div>
  )
}

export function CatalogSearch({ value, onChange, placeholder = 'Oyuncu adı' }: { value: string; onChange: (q: string) => void; placeholder?: string }) {
  return (
    <label className="relative flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-muted">
      Ara
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-muted" />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </label>
  )
}

/** Mobilde (<820px) süzgeçleri alttan açılan sayfada gösteren düğme; rozet etkin süzgeç sayısı. */
export function CatalogFiltersButton({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <Button onClick={onOpen} aria-haspopup="dialog" className="gap-2">
      <SlidersHorizontal size={16} aria-hidden="true" />
      Filtreler{count > 0 ? ` (${count})` : ''}
    </Button>
  )
}

/** Mevki çipleri: mobilde yatay kaydırılır, masaüstünde sarılır. */
export function PositionChips({ value, onChange }: { value: string[]; onChange: (pos: string[]) => void }) {
  return (
    <div role="group" aria-label="Mevki" className="flex gap-1.5 max-[819px]:-mx-3 max-[819px]:overflow-x-auto max-[819px]:px-3 max-[819px]:pb-1 min-[820px]:flex-wrap">
      {POSITIONS.map((pos) => (
        <Chip key={pos} pressed={value.includes(pos)} onClick={() => onChange(value.includes(pos) ? value.filter((x) => x !== pos) : [...value, pos])}>{pos}</Chip>
      ))}
    </div>
  )
}

/** Masaüstünde ek süzgeçler katlanır bölümde; etkin süzgeç varsa açık başlar. */
export function MoreFilters({ count, children }: { count: number; children: ReactNode }) {
  return (
    <details open={count > 0} className="text-sm">
      <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent">Daha fazla filtre{count > 0 ? ` (${count})` : ''}</summary>
      <div className="pt-2">{children}</div>
    </details>
  )
}
