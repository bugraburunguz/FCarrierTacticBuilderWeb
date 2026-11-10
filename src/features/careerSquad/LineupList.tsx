import { Link } from 'react-router-dom'
import type { CareerPlayer } from '../../api/types'
import { Chip, OvrBox, Panel, type DataSource } from '../../design/components/primitives'
import type { SellAdvice } from '../../lib/deskRules'
import { squadRowStatus } from '../../lib/squadRowStatus'
import type { LineupGroups } from './careerSquadRules'

function Row({ position, entry, advice }: { position: string; entry: CareerPlayer; advice?: SellAdvice }) {
  const view = squadRowStatus(entry, advice)
  return (
    <tr data-status={view?.status} className="border-t border-line">
      <td className={`py-1 pr-2 text-xs font-semibold text-muted ${view?.stripe ?? ''}`}>{position}</td>
      <td className="min-w-0 py-1 pr-2 font-medium">
        <Link to={`/players/${entry.player.id}`} className="block truncate hover:underline">{entry.player.name}</Link>
      </td>
      <td className="py-1 pr-2 text-right"><OvrBox value={entry.player.overall} size="sm" /></td>
      <td className="py-1 pr-2 text-right tabular-nums text-ink-2">{entry.dynamicPotential ?? entry.player.potential ?? '—'}</td>
      <td className="py-1">{view && <Chip tone={view.tone} title={view.title}>{view.shortLabel}</Chip>}</td>
    </tr>
  )
}

/**
 * FCA-3 Diziliş listesi (Stitch: saha solda, liste sağda): İlk 11 (slot mevkisiyle) · Yedekler · Kadro dışı; satırda OVR kutusu, POT,
 * durum (kiralık / Sat / Süre ver) şerit + çip. Salt okunur; satır oyuncu sayfasına gider.
 */
export function LineupList({ groups, advice, source }: { groups: LineupGroups; advice: Map<number, SellAdvice>; source?: DataSource }) {
  const sections = [
    { key: 'xi', title: 'İlk 11', rows: groups.starters.map((s) => ({ position: s.position, entry: s.player })) },
    { key: 'bench', title: 'Yedekler', rows: groups.bench.map((c) => ({ position: c.player.positions[0] ?? '—', entry: c })) },
    { key: 'others', title: 'Kadro dışı', rows: groups.others.map((c) => ({ position: c.player.positions[0] ?? '—', entry: c })) },
  ]
  return (
    <Panel title="Diziliş listesi" label="Diziliş listesi" source={source}>
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-12" />
          <col className="w-12" />
          <col className="w-24" />
        </colgroup>
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th scope="col" className="pr-2">Mvk</th>
            <th scope="col" className="pr-2">Oyuncu</th>
            <th scope="col" className="pr-2 text-right">OVR</th>
            <th scope="col" className="pr-2 text-right">POT</th>
            <th scope="col">Durum</th>
          </tr>
        </thead>
        {sections.map((s) => (
          <tbody key={s.key}>
            <tr>
              <th scope="rowgroup" colSpan={5} className="pt-3 pb-1 text-sm font-semibold normal-case">
                {s.title} <span className="font-normal text-muted">· {s.rows.length}</span>
              </th>
            </tr>
            {s.key === 'xi' && groups.empty.length > 0 && (
              <tr><td colSpan={5} className="py-1 text-xs text-warn">Boş slot: {groups.empty.join(', ')}</td></tr>
            )}
            {s.rows.map((r) => <Row key={r.entry.player.id} position={r.position} entry={r.entry} advice={advice.get(r.entry.player.id)} />)}
          </tbody>
        ))}
      </table>
    </Panel>
  )
}
