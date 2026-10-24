import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer } from '../../api/types'
import { Chip, Panel, Skeleton, SourceTag, type DataSource } from '../../design/components/primitives'
import { jobLayer, seasonJobs, type ActionKind } from '../../lib/deskRules'
import { toDeskSlots, type SlotFitRow } from '../squad/useSlotFits'

const TITLE = 'Bu dönemin 3 işi'
const MIN_SQUAD = 11
const KIND_LABEL: Record<ActionKind, string> = { FILL: 'Transfer', SELL: 'Satış', LOAN: 'Kiralık', DEPTH: 'Derinlik', CONTRACT: 'Sözleşme' }

/**
 * "Bu dönemin 3 işi" (KARIYER-UX FAZ 2 düzeltme 3): Ana sayfa ve Masa'nın ortak bileşeni; kurallar `deskRules.seasonJobs`.
 * Başlık etiketi taktik kaynağı (ana taktik "Kararın", yoksa "Otomatik öneri"); her iş kendi kural kaynağıyla etiketlenir (kayıt ya da taktik).
 * `framed`: Masa'da panel; Ana sayfada başka bir yüzeyin içinde düz bölüm (iç içe .glass yok).
 */
export function SeasonJobs({ careerId, squad, rows, tacticSource, record, gameDate, pending, exclude, framed = true }: {
  careerId: number
  squad: readonly CareerPlayer[]
  rows: SlotFitRow[]
  tacticSource?: DataSource
  /** Son içe aktarma (kayıt verisi etiketi); yoksa kayıt kaynaklı işlerde etiket yok. */
  record?: DataSource
  gameDate?: string
  pending?: boolean
  exclude?: ReadonlySet<string>
  framed?: boolean
}) {
  const tagList = useQuery({ queryKey: ['tags', careerId], queryFn: () => endpoints.playerTags(careerId), retry: false })
  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const jobs = useMemo(() => seasonJobs({ squad: [...squad], slots: toDeskSlots(rows), tags, gameDate }, { exclude }), [squad, rows, tags, gameDate, exclude])

  const body: ReactNode = pending ? <Skeleton className="h-28" /> : jobs.length === 0 ? (
    <p className="text-sm text-ink-2">{squad.length < MIN_SQUAD ? 'Öneri için kadroda en az 11 oyuncu olmalı.' : 'Şu an acil bir iş yok.'}</p>
  ) : (
    <ol className="flex flex-col gap-2">
      {jobs.map((job, i) => {
        const source = jobLayer(job.kind) === 'record' ? record : tacticSource
        return (
          <li key={`${job.kind}-${job.title}`} className="glass-3 flex items-start gap-3 p-2.5">
            <span aria-hidden="true" className="font-display text-2xl font-bold leading-none text-accent">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{KIND_LABEL[job.kind]}</Chip>
                <b className="text-sm">{job.title}</b>
                {source && <SourceTag source={source} />}
              </div>
              <p className="mt-1 text-xs text-ink-2">{job.reason}</p>
            </div>
            <Link to={job.to} className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">Gör</Link>
          </li>
        )
      })}
    </ol>
  )

  return framed ? <Panel title={TITLE} label={TITLE} source={tacticSource}>{body}</Panel> : <PlainSection source={tacticSource}>{body}</PlainSection>
}

function PlainSection({ source, children }: { source?: DataSource; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h3 id={id} className="text-sm font-semibold text-ink-2">{TITLE}</h3>
        {source && <SourceTag source={source} />}
      </header>
      {children}
    </section>
  )
}
