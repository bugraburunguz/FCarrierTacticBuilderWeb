import { Link } from 'react-router-dom'
import type { PlayerSummary } from '../../api/types'
import { CompareButton } from '../../components/CompareButton'
import { VirtualChunk } from '../../design/components/VirtualChunk'
import type { CardFilters, CardSort } from './cardFilters'
import { playerHref } from './CardTile'

const COLUMNS: { key: CardSort; label: string; className?: string }[] = [
  { key: 'overall', label: 'OVR', className: 'text-right' },
  { key: 'name', label: 'Oyuncu' },
  { key: 'position', label: 'Mevki' },
  { key: 'age', label: 'Yaş', className: 'text-right' },
  { key: 'club', label: 'Kulüp' },
  { key: 'league', label: 'Lig' },
  { key: 'weakfoot', label: 'ZA', className: 'text-right' },
  { key: 'skillmoves', label: 'HR', className: 'text-right' },
]

/**
 * Tablo görünümü: başlık satırı yapışkan, ilk iki sütun (OVR, Oyuncu) yatay kaydırmada sabit, satırlar blur'suz, pencereli parçalar, sıralanabilir başlıklar `aria-sort` (11 §6 DataTable).
 * ≥820px: yatay kaydırma kabı yok, başlık satırı sayfada üst başlık + yapışkan filtre çubuğunun hemen altına yapışır (`--header-h` + `--filters-h`).
 * <820px: tablo yatay kaydırılır; kaydırma kabı içinde başlık sayfaya yapışamaz (kap dikey kaymaz), ilk iki sütun sabit kalır.
 */
/** OVR ve Oyuncu sütunları: yalnız <820px yapışkan ve opak (glass.css `.table-sticky-col`); masaüstünde satırla aynı ton. */
const STICKY = ['table-sticky-col left-0 w-14 min-w-14', 'table-sticky-col left-14']
const ROW_ESTIMATE = 37
export function CardTable({ groups, filters, onSort }: { groups: PlayerSummary[][]; filters: CardFilters; onSort: (key: CardSort) => void }) {
  return (
    <div className="glass-3 max-[819px]:overflow-x-auto">
      <table className="w-full text-sm max-[819px]:min-w-[720px]">
        <caption className="sr-only">Kart veritabanı (ZA: zayıf ayak, HR: hareket)</caption>
        <thead className="glass-sticky sticky top-0 z-20 text-xs text-muted min-[820px]:top-[calc(var(--header-h)+var(--filters-h,0px))]">
          <tr>
            {COLUMNS.map((c) => {
              const active = filters.sort === c.key
              return (
                <th key={c.key} scope="col" aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-medium ${c.className ?? 'text-left'} ${STICKY[COLUMNS.indexOf(c)] ?? ''}`}>
                  <button type="button" onClick={() => onSort(c.key)} className={`inline-flex min-h-8 items-center gap-1 hover:text-ink max-sm:min-h-11 ${active ? 'text-ink' : ''}`}>
                    {c.label}
                    <span aria-hidden="true">{active ? (filters.order === 'asc' ? '↑' : '↓') : ''}</span>
                  </button>
                </th>
              )
            })}
            <th scope="col" className="px-3 py-2"><span className="sr-only">Karşılaştır</span></th>
          </tr>
        </thead>
        {groups.map((group) => (
          <VirtualChunk key={group[0].id} kind="table" colSpan={COLUMNS.length + 1} estimate={group.length * ROW_ESTIMATE}>
            {group.map((p) => (
              <tr key={p.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                <td className={`px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums ${STICKY[0]}`}>{p.overall}</td>
                <td className={`px-3 py-1.5 ${STICKY[1]}`}><Link to={playerHref(p)} className="font-medium text-ink hover:underline">{p.name}</Link></td>
                <td className="px-3 py-1.5 font-[var(--font-num)] text-xs text-ink-2">{p.positions.join(' ')}</td>
                <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.age ?? '–'}</td>
                <td className="max-w-[160px] truncate px-3 py-1.5 text-ink-2">{p.club ?? '–'}</td>
                <td className="max-w-[160px] truncate px-3 py-1.5 text-ink-2">{p.league ?? '–'}</td>
                <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.weakFoot ?? '–'}</td>
                <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.skillMoves ?? '–'}</td>
                <td className="px-3 py-1.5 text-right"><CompareButton entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} compact /></td>
              </tr>
            ))}
          </VirtualChunk>
        ))}
      </table>
    </div>
  )
}
