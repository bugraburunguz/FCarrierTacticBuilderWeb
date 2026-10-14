import { Link } from 'react-router-dom'
import type { PlayerSummary } from '../../api/types'
import { CompareButton } from '../../components/CompareButton'
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

/** Tablo görünümü: başlık satırı yapışkan, satırlar blur'suz, sıralanabilir başlıklar `aria-sort` (11 §6 DataTable). */
export function CardTable({ players, filters, onSort }: { players: PlayerSummary[]; filters: CardFilters; onSort: (key: CardSort) => void }) {
  return (
    <div className="glass-3 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Kart veritabanı (ZA: zayıf ayak, HR: hareket)</caption>
        <thead className="sticky top-0 bg-[var(--sheet-bg)] text-xs text-muted">
          <tr>
            {COLUMNS.map((c) => {
              const active = filters.sort === c.key
              return (
                <th key={c.key} scope="col" aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 font-medium ${c.className ?? 'text-left'}`}>
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
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
              <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums">{p.overall}</td>
              <td className="px-3 py-1.5"><Link to={playerHref(p)} className="font-medium text-ink hover:underline">{p.name}</Link></td>
              <td className="px-3 py-1.5 font-[var(--font-num)] text-xs text-ink-2">{p.positions.join(' ')}</td>
              <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.age ?? '–'}</td>
              <td className="max-w-[160px] truncate px-3 py-1.5 text-ink-2">{p.club ?? '–'}</td>
              <td className="max-w-[160px] truncate px-3 py-1.5 text-ink-2">{p.league ?? '–'}</td>
              <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.weakFoot ?? '–'}</td>
              <td className="px-3 py-1.5 text-right font-[var(--font-num)] tabular-nums text-ink-2">{p.skillMoves ?? '–'}</td>
              <td className="px-3 py-1.5 text-right"><CompareButton entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} compact /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
