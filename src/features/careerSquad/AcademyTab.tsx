import { Link } from 'react-router-dom'
import type { Academy } from '../../api/types'
import { Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../design/components/primitives'
import { HelpPopover } from '../../components/ui'

const NUM = 'pr-2 text-right tabular-nums'
const SM = 'hidden sm:table-cell'
const LG = 'hidden lg:table-cell'

/**
 * ACADEMY-b (Kadro › Altyapı): kariyerin altyapı oyuncuları, A takım kadrosundan ayrı. En iyi mevki FIT-3 kuralıyla (taraf gerekçesi yardımda), önerilen
 * gelişim planı ve "A takıma al" önerisi tahmindir; uygulama oyunda yapılır. Karar 3: altyapı alanlarından yalnız "Altyapıdaki süre (ay)" görünür;
 * potansiyel aralığı, belirsizlik ve seviye alanları anlamı doğrulanmadığı için gizli.
 */
export function AcademyTab({ academy, loading, error, onRetry }: { academy?: Academy; loading: boolean; error: boolean; onRetry: () => void }) {
  if (error && !academy) {
    return <ErrorState message="Altyapı yüklenemedi." onRetry={onRetry} />
  }
  if (loading || !academy) {
    return <Skeleton className="h-64" />
  }
  const players = academy.players
  if (!academy.found || players.length === 0) {
    return (
      <Panel title="Altyapı">
        <EmptyState>Altyapıda oyuncu yok.</EmptyState>
        <p className="text-center text-xs text-muted">Oyuncular export'ta görünmüyorsa kariyer içinden yeni export al.</p>
      </Panel>
    )
  }
  return (
    <Panel title={`${academy.name ?? 'Altyapı'} · ${players.length}`} actions={(
      <HelpPopover label="Altyapı hakkında">
        Önerilen plan ve "A takıma al" tahmindir, kalibre edilmedi. A takıma alma oyunda yapılır.
      </HelpPopover>
    )}>
      <table className="w-full table-fixed text-left text-sm" data-academy-table>
        <colgroup>
          <col />
          <col className="hidden w-12 sm:table-column" />
          <col className="hidden w-28 lg:table-column" />
          <col className="w-16 sm:w-24" />
          <col className="w-12" />
          <col className="w-12" />
          <col className="hidden w-24 sm:table-column" />
          <col className="hidden w-48 sm:table-column" />
        </colgroup>
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th scope="col" className="py-1 pr-2">Oyuncu</th>
            <th scope="col" className={`pr-2 text-right ${SM}`}>Yaş</th>
            <th scope="col" className={`pr-2 ${LG}`}>Mevkiler</th>
            <th scope="col" className="pr-2">En iyi mevki</th>
            <th scope="col" className="pr-2 text-right">OVR</th>
            <th scope="col" className="pr-2 text-right">POT</th>
            <th scope="col" className={`pr-2 text-right ${SM}`}>Altyapıda</th>
            <th scope="col" className={SM}>Önerilen plan</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const positions = p.positions.slice(0, 4).join(', ')
            const months = p.monthsInSquad !== undefined && p.monthsInSquad !== null ? `${p.monthsInSquad} ay` : '—'
            const plan = p.plan && (
              <span className="inline-flex items-center gap-1">
                <span className="truncate">{p.plan.name}</span>
                <HelpPopover label="Plan gerekçesi">{p.plan.text}</HelpPopover>
              </span>
            )
            return (
              <tr key={p.playerId} className="border-t border-line align-top">
                <td data-col="name" className="py-1.5 pr-2 font-medium">
                  <Link to={`/players/${p.playerId}`} className="block truncate hover:underline">{p.name}</Link>
                  <span data-compact className="block text-xs font-normal text-muted lg:hidden">
                    {positions}<span className="sm:hidden">{p.age !== undefined && p.age !== null && ` · ${p.age} yaş`} · {months}</span>
                  </span>
                  {p.promote && (
                    <span className="mt-1 flex items-center gap-1">
                      <Chip tone="good">A takıma al: {p.promote.position}</Chip>
                      <HelpPopover label="A takıma al gerekçesi">{p.promote.text}</HelpPopover>
                    </span>
                  )}
                  {p.plan && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-normal text-ink-2 sm:hidden">
                      {`Plan: ${p.plan.name}`}
                      <HelpPopover label="Plan gerekçesi">{p.plan.text}</HelpPopover>
                    </span>
                  )}
                </td>
                <td data-col="age" className={`py-1.5 ${NUM} ${SM}`}>{p.age ?? '—'}</td>
                <td data-col="positions" className={`py-1.5 pr-2 text-muted ${LG}`}>{positions}</td>
                <td data-col="best" className="py-1.5 pr-2">
                  {p.bestPosition ? (
                    <span className="inline-flex items-center gap-1">
                      <b>{p.bestPosition}</b>
                      {p.sideReason && <HelpPopover label="Taraf gerekçesi">{p.sideReason}</HelpPopover>}
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td data-col="ovr" className={`py-1.5 font-semibold ${NUM}`}>{p.overall ?? '—'}</td>
                <td data-col="pot" className={`py-1.5 ${NUM}`}>{p.potential ?? '—'}</td>
                <td data-col="months" className={`py-1.5 ${NUM} ${SM}`}>{months}</td>
                <td data-col="plan" className={`py-1.5 ${SM}`}>{plan ?? <span className="text-muted">—</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}
