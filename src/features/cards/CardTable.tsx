import { Link } from 'react-router-dom'
import type { PlayerSummary } from '../../api/types'
import { CompareButton } from '../../components/CompareButton'
import { CatalogTable, type CatalogColumn } from '../catalog/CatalogTable'
import type { CardFilters, CardSort } from './cardFilters'
import { playerHref } from './CardTile'

const NUM = 'font-[var(--font-num)] tabular-nums'
const COLUMNS: CatalogColumn<PlayerSummary, CardSort>[] = [
  { sort: 'overall', label: 'OVR', align: 'right', cellClassName: NUM, cell: (p) => p.overall },
  { sort: 'name', label: 'Oyuncu', cell: (p) => <Link to={playerHref(p)} className="font-medium text-ink hover:underline">{p.name}</Link> },
  { sort: 'position', label: 'Mevki', cellClassName: 'font-[var(--font-num)] text-xs text-ink-2', cell: (p) => p.positions.join(' ') },
  { sort: 'age', label: 'Yaş', align: 'right', cellClassName: `${NUM} text-ink-2`, cell: (p) => p.age ?? '–' },
  { sort: 'club', label: 'Kulüp', cellClassName: 'max-w-[160px] truncate text-ink-2', cell: (p) => p.club ?? '–' },
  { sort: 'league', label: 'Lig', cellClassName: 'max-w-[160px] truncate text-ink-2', cell: (p) => p.league ?? '–' },
  { sort: 'weakfoot', label: 'ZA', align: 'right', cellClassName: `${NUM} text-ink-2`, cell: (p) => p.weakFoot ?? '–' },
  { sort: 'skillmoves', label: 'HR', align: 'right', cellClassName: `${NUM} text-ink-2`, cell: (p) => p.skillMoves ?? '–' },
  { label: <span className="sr-only">Karşılaştır</span>, align: 'right', cell: (p) => <CompareButton entry={{ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' }} compact /> },
]

/** Kart veritabanı tablosu: ortak Katalog tablosu (yapışkan başlık, sabit ilk iki sütun, pencereli parçalar). */
export function CardTable({ groups, filters, onSort }: { groups: PlayerSummary[][]; filters: CardFilters; onSort: (key: CardSort) => void }) {
  return <CatalogTable caption="Kart veritabanı (ZA: zayıf ayak, HR: hareket)" columns={COLUMNS} groups={groups} sort={filters.sort} order={filters.order} onSort={onSort} />
}
