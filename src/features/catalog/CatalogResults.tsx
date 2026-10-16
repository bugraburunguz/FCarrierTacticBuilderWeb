import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import { useRef, type ReactNode } from 'react'
import type { PageResponse } from '../../api/types'
import { VirtualChunk } from '../../design/components/VirtualChunk'
import { Button, EmptyState, ErrorState, Skeleton } from '../../design/components/primitives'
import { cardGridLayout, useElementSize } from '../cards/cardGrid'
import { CATALOG_PAGE_SIZE, chunked } from './catalogChunks'

const SKELETONS = 12
/** Izgara parçasının ilk yükseklik tahmini (px); ölçülünce gerçek yükseklik kullanılır. */
const CHUNK_ESTIMATE = 1400

export interface CatalogTexts {
  /** "kart" / "oyuncu": durum satırı ve "daha yükle" düğmesi. */
  noun: string
  error: string
  empty: string
  emptyFiltered: string
}

/**
 * Katalog sonuçları: yükleniyor iskeleti, hata, boş durum, "n · gösteriliyor" satırı, ızgara (cardGridLayout + VirtualChunk) ya da tablo, "daha fazla yükle".
 * Kart hücreyi doldurur; sütun sayısı kartın ölçülmüş eşiğin (çip + 6 stat ≥ 11px) altına düşmeyeceği kadar.
 */
export function CatalogResults<T extends { id: number }>({ query, view, texts, filtered, onClear, renderTile, renderTable }: {
  query: UseInfiniteQueryResult<InfiniteData<PageResponse<T>>>
  view: 'grid' | 'table'
  texts: CatalogTexts
  filtered: boolean
  onClear: () => void
  renderTile: (item: T, cardWidth: number) => ReactNode
  renderTable: (groups: T[][]) => ReactNode
}) {
  const gridBox = useRef<HTMLDivElement>(null)
  const layout = cardGridLayout(useElementSize(gridBox).width)
  const gridStyle = { gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gap: layout.gap }
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.totalItems ?? 0

  return (
    <div ref={gridBox} className="flex flex-col gap-4">
      {query.isLoading ? (
        <ul aria-busy="true" aria-label="Yükleniyor" className="grid" style={gridStyle}>
          {Array.from({ length: SKELETONS }, (_, i) => (
            <li key={i}><Skeleton className="h-[260px]" /></li>
          ))}
        </ul>
      ) : query.isError ? (
        <ErrorState message={texts.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState action={filtered ? <Button onClick={onClear}>Süzgeçleri temizle</Button> : undefined}>
          {filtered ? texts.emptyFiltered : texts.empty}
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-xs text-muted">{total.toLocaleString('tr-TR')} {texts.noun} · {items.length} gösteriliyor</p>
          {view === 'table' ? renderTable(chunked(items)) : (
            <div className="flex flex-col gap-3">
              {chunked(items).map((group) => (
                <VirtualChunk key={group[0].id} estimate={CHUNK_ESTIMATE}>
                  <ul className="grid" style={gridStyle}>
                    {group.map((item) => renderTile(item, layout.cardWidth))}
                  </ul>
                </VirtualChunk>
              ))}
            </div>
          )}
          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} disabledReason={query.isFetchingNextPage ? 'Yükleniyor…' : undefined}>
                {CATALOG_PAGE_SIZE} {texts.noun} daha yükle
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
