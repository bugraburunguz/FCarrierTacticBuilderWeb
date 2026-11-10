import { Link } from 'react-router-dom'
import type { CareerPlayer } from '../../api/types'
import { Chip, OvrBox, Panel, type DataSource } from '../../design/components/primitives'
import type { SellAdvice } from '../../lib/deskRules'
import { squadRowStatus } from '../../lib/squadRowStatus'
import type { LineupGroups } from './careerSquadRules'

// <640'ta POT ve Durum sütunu yok; grup satırları her genişlikte görünen 3 sütuna yayılır (daha geniş colSpan dar ekranda boş sütun açar).
const SM = 'hidden sm:table-cell'
const SPAN = 3

function Row({ position, entry, advice }: { position: string; entry: CareerPlayer; advice?: SellAdvice }) {
  const view = squadRowStatus(entry, advice)
  return (
    <tr data-status={view?.status} className="border-t border-line">
      <td className={`py-1 pr-2 text-xs font-semibold text-muted ${view?.stripe ?? ''}`}>
        {position}
        {/* Gerekçe yalnız title'da kalmasın: dokunmatik ve ekran okuyucu için metin (her genişlikte bir kez). */}
        {view?.title && <span className="sr-only">{view.label}: {view.title}</span>}
      </td>
      <td className="min-w-0 py-1 pr-2 font-medium">
        <Link to={`/players/${entry.player.id}`} className="block truncate hover:underline max-sm:flex max-sm:min-h-11 max-sm:items-center">{entry.player.name}</Link>
        {/* <640: POT ve Durum sütunu yok; çip ismin altında (isim kesilmesin). */}
        {view && <span className="mt-0.5 block sm:hidden"><Chip tone={view.tone} title={view.title}>{view.shortLabel}</Chip></span>}
      </td>
      <td className="py-1 pr-2 text-right"><OvrBox value={entry.player.overall} size="sm" /></td>
      <td className={`py-1 pr-2 text-right tabular-nums text-ink-2 ${SM}`}>{entry.dynamicPotential ?? entry.player.potential ?? '—'}</td>
      <td className={`py-1 ${SM}`}>
        {view && <Chip tone={view.tone} title={view.title}>{view.shortLabel}</Chip>}
      </td>
    </tr>
  )
}

/**
 * FCA-3 Diziliş listesi (Stitch: saha solda, liste sağda): İlk 11 (slot mevkisiyle) · Yedekler · Kadro dışı; satırda OVR kutusu, POT,
 * durum (kiralık / Sat / Süre ver) şerit + çip. Salt okunur; satır oyuncu sayfasına gider.
 */
export function LineupList({ groups, advice, source }: { groups: LineupGroups; advice: Map<number, SellAdvice>; source?: DataSource }) {
  const sections = [
    { key: 'xi', title: 'İlk 11', rows: groups.starters.map((s) => ({ key: s.slotId, position: s.position, entry: s.player })) },
    { key: 'bench', title: 'Yedekler', rows: groups.bench.map((b) => ({ key: String(b.player.player.id), position: b.position, entry: b.player })) },
    { key: 'others', title: 'Kadro dışı', rows: groups.others.map((c) => ({ key: String(c.player.id), position: c.player.positions[0] ?? '—', entry: c })) },
  ]
  const noLineup = groups.starters.length === 0
  return (
    <Panel title="Diziliş listesi" label="Diziliş listesi" source={source}>
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-12" />
          <col className="hidden w-12 sm:table-column" />
          <col className="hidden w-28 sm:table-column" />
        </colgroup>
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th scope="col" className="pr-2">Mvk</th>
            <th scope="col" className="pr-2">Oyuncu</th>
            <th scope="col" className="pr-2 text-right">OVR</th>
            <th scope="col" className={`pr-2 text-right ${SM}`}>POT</th>
            <th scope="col" className={SM}>Durum</th>
          </tr>
        </thead>
        {sections.map((s) => (
          <tbody key={s.key}>
            <tr>
              <th scope="rowgroup" colSpan={SPAN} className="pt-3 pb-1 text-sm font-semibold normal-case">
                {s.title} <span className="font-normal text-muted">· {s.rows.length}</span>
              </th>
            </tr>
            {s.key === 'xi' && noLineup && (
              <tr><td colSpan={SPAN} className="py-1 text-xs text-ink-2">Ana taktik ya da öneri yok: İlk 11 belirlenemedi.</td></tr>
            )}
            {s.key === 'xi' && !noLineup && groups.empty.length > 0 && (
              <tr><td colSpan={SPAN} className="py-1 text-xs text-warn">Boş slot: {groups.empty.join(', ')}</td></tr>
            )}
            {s.rows.map((r) => <Row key={r.key} position={r.position} entry={r.entry} advice={advice.get(r.entry.player.id)} />)}
          </tbody>
        ))}
      </table>
    </Panel>
  )
}
