import { useQuery } from '@tanstack/react-query'
import { useId, type ReactNode } from 'react'
import { EmptyState, ErrorState, Skeleton, SourceTag } from '../../design/components/primitives'
import { PlanComparison } from './PlanComparison'
import { teamText, youthDetailQuery } from './youthDetail'

const NOT_FOUND = 404

function Block({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <h3 id={id} className="font-display text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Oyuncu paneli (ACADEMY-b §2; Altyapı ve Gelişim ortak): Ne yapmalıyım? · Hangi mevkide? · Takımdaki yeri. Masaüstünde sağ panelde, mobilde ayrı sayfada.
 * Motor terimi yok; birincil sayılar OVR, yaş, mevki. Hepsi tahmin.
 */
export function YouthDetailBody({ careerId, playerId }: { careerId: number; playerId: number }) {
  const detail = useQuery(youthDetailQuery(careerId, playerId))
  if (detail.isLoading) {
    return <Skeleton className="h-72" />
  }
  if (detail.isError && (detail.error as { status?: number }).status === NOT_FOUND) {
    return <EmptyState>Bu oyuncu altyapıda ya da kadroda değil.</EmptyState>
  }
  if (detail.isError || !detail.data) {
    return <ErrorState message="Oyuncu önerisi yüklenemedi." onRetry={() => detail.refetch()} />
  }
  const { advice, position, team } = detail.data
  return (
    <div className="flex flex-col gap-4">
      <Block title="Ne yapmalıyım?">
        <p className="text-sm">{advice.sentence}</p>
        <PlanComparison plans={advice.plans} />
        {advice.assumption && <p className="text-xs text-ink-2">{advice.assumption}</p>}
      </Block>
      <Block title="Hangi mevkide?">
        <p className="text-sm">
          En iyi mevki <b>{position.bestPosition}</b>{position.bestOverall !== undefined && position.bestOverall !== null && <> · OVR {position.bestOverall}</>}
          <span className="text-ink-2"> · listede {position.listedPositions.join(', ')}</span>
        </p>
        {position.conversionText && <p className="text-sm text-ink-2">{position.conversionText}</p>}
        {position.sideReason && <p className="text-sm text-ink-2">Taraf: {position.sideReason}</p>}
      </Block>
      <Block title="Takımdaki yeri">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <b>{team.position}</b>
          <SourceTag source={team.source === 'MAIN' ? { kind: 'decision', label: 'Ana taktiğe göre' } : { kind: 'auto' }} />
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          <li>İlk 11: {team.starterName ? <>{team.starterName} <span className="tabular-nums text-ink-2">Güç {team.starterStrength}</span></> : '—'}</li>
          <li>Yedek: {team.backupName ? <>{team.backupName} <span className="tabular-nums text-ink-2">Güç {team.backupStrength}</span></> : 'yok'}</li>
          <li>Tahmini Güç: <span className="tabular-nums">{team.strengths.map((s, i) => `${i + 1}. sezon ${Math.round(s)}`).join(' · ')}</span></li>
        </ul>
        <p className="text-sm">{teamText(team)} <span className="text-xs text-muted">(tahmin)</span></p>
        {detail.data.eligibleText && <p className="text-xs text-muted">{detail.data.eligibleText}</p>}
      </Block>
    </div>
  )
}
