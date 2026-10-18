import type { ReactNode } from 'react'
import { VirtualChunk } from '../../design/components/VirtualChunk'

export interface CatalogColumn<T, K extends string> {
  /** Sıralanabilir sütunun sunucu sıralama anahtarı; yoksa başlık düz metin. */
  sort?: K
  label: ReactNode
  /** Erişilebilir sütun adı (görünen etiket kısaltmaysa). */
  title?: string
  align?: 'right'
  /** Hücre ek sınıfı (ör. `max-w-[160px] truncate`). */
  cellClassName?: string
  cell: (item: T) => ReactNode
}

/**
 * İlk iki sütun (Oyuncu, OVR): yalnız <820px yapışkan ve opak (glass.css `.table-sticky-col`); masaüstünde satırla aynı ton. Ad sütunu sabit
 * genişlikte (uzun ad kısalır, tam adı title'da), OVR hemen yanında. Önceden OVR ilk sütundaydı ve ada yapışık okunup gözden kaçıyordu.
 */
const STICKY = ['table-sticky-col left-0 max-[819px]:w-36 max-[819px]:min-w-36 max-[819px]:max-w-36', 'table-sticky-col left-36 max-[819px]:w-14 max-[819px]:min-w-14']
const ROW_ESTIMATE = 37

/**
 * Katalog tablosu (11 §6 DataTable): başlık satırı yapışkan, ilk iki sütun yatay kaydırmada sabit, satırlar blur'suz, pencereli parçalar,
 * sıralanabilir başlıklar `aria-sort`.
 * ≥820px: yatay kaydırma kabı yok, başlık sayfada üst başlık + yapışkan filtre çubuğunun hemen altına yapışır (`--header-h` + `--filters-h`).
 * <820px: tablo yatay kaydırılır; kaydırma kabı içinde başlık sayfaya yapışamaz (kap dikey kaymaz), ilk iki sütun sabit kalır.
 */
export function CatalogTable<T extends { id: number }, K extends string>({ caption, columns, groups, sort, order, onSort, minWidth = 720 }: {
  caption: string
  columns: CatalogColumn<T, K>[]
  groups: T[][]
  sort: string
  order: 'asc' | 'desc'
  onSort: (key: K) => void
  minWidth?: number
}) {
  const align = (c: CatalogColumn<T, K>) => (c.align === 'right' ? 'text-right' : 'text-left')
  return (
    <div className="glass-3 max-[819px]:overflow-x-auto">
      <table className="w-full text-sm max-[819px]:min-w-[var(--table-min)]" style={{ '--table-min': `${minWidth}px` } as React.CSSProperties}>
        <caption className="sr-only">{caption}</caption>
        <thead className="glass-sticky sticky top-0 z-20 text-xs text-muted min-[820px]:top-[calc(var(--header-h)+var(--filters-h,0px))]">
          <tr>
            {columns.map((c, i) => {
              const active = c.sort !== undefined && sort === c.sort
              return (
                <th key={i} scope="col" title={c.title} aria-sort={c.sort === undefined ? undefined : active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-medium ${align(c)} ${STICKY[i] ?? ''}`}>
                  {c.sort === undefined ? c.label : (
                    <button type="button" onClick={() => onSort(c.sort as K)} className={`inline-flex min-h-8 items-center gap-1 hover:text-ink max-sm:min-h-11 ${active ? 'text-ink' : ''}`}>
                      {c.label}
                      <span aria-hidden="true">{active ? (order === 'asc' ? '↑' : '↓') : ''}</span>
                    </button>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        {groups.map((group) => (
          <VirtualChunk key={group[0].id} kind="table" colSpan={columns.length} estimate={group.length * ROW_ESTIMATE}>
            {group.map((item) => (
              <tr key={item.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                {columns.map((c, i) => (
                  <td key={i} className={`px-3 py-1.5 ${align(c)} ${c.cellClassName ?? ''} ${STICKY[i] ?? ''}`}>{c.cell(item)}</td>
                ))}
              </tr>
            ))}
          </VirtualChunk>
        ))}
      </table>
    </div>
  )
}
