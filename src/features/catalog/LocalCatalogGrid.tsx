import { useRef, type ReactNode } from 'react'
import { VirtualChunk } from '../../design/components/VirtualChunk'
import { cardGridLayout, useElementSize } from '../cards/cardGrid'
import { chunked } from './catalogChunks'

/** Izgara parçasının ilk yükseklik tahmini (px); ölçülünce gerçek yükseklik. CatalogResults ile aynı. */
const CHUNK_ESTIMATE = 1400

/**
 * Katalog ızgarası, yerel liste için (V3-07c; kulüp kartları IndexedDB'de): CatalogResults'la aynı sütun kuralı (cardGridLayout) ve
 * pencereleme (VirtualChunk, 24'lük parçalar). Durumlar (boş/yükleniyor) çağıranda.
 */
export function LocalCatalogGrid<T>({ items, keyOf, renderTile }: { items: T[]; keyOf: (item: T) => string; renderTile: (item: T, cardWidth: number) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const layout = cardGridLayout(useElementSize(box).width)
  const style = { gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gap: layout.gap }
  return (
    <div ref={box} className="flex flex-col gap-3">
      {chunked(items).map((group) => (
        <VirtualChunk key={keyOf(group[0])} estimate={CHUNK_ESTIMATE}>
          <ul className="grid" style={style}>{group.map((item) => renderTile(item, layout.cardWidth))}</ul>
        </VirtualChunk>
      ))}
    </div>
  )
}
