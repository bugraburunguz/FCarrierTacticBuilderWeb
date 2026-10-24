import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer } from '../../api/types'
import { Chip, Panel, Skeleton, SourceTag, type DataSource } from '../../design/components/primitives'
import { seasonJobs, type ActionKind } from '../../lib/deskRules'
import { toDeskSlots, type SlotFitRow } from '../squad/useSlotFits'

const TITLE = 'Bu dönemin 3 işi'
const MIN_SQUAD = 11
const KIND_LABEL: Record<ActionKind, string> = { FILL: 'Transfer', SELL: 'Satış', LOAN: 'Kiralık', DEPTH: 'Derinlik', CONTRACT: 'Sözleşme' }

/**
 * "Bu dönemin 3 işi" (KARIYER-UX FAZ 2 düzeltme 3): Ana sayfa ve Masa'nın ortak bileşeni; kurallar `deskRules.seasonJobs`.
 * Başlık etiketi taktik kaynağı (ana taktik "Ana taktiğe göre", yoksa "Otomatik öneri"); satırlar sistem önerisi, satır başına etiket yok (FAZ 6a-D).
 * `framed`: Masa'da panel; Ana sayfada başka bir yüzeyin içinde düz bölüm (iç içe .glass yok).
 */
export function SeasonJobs({ careerId, squad, rows, tacticSource, gameDate, pending, exclude, framed = true }: {
  careerId: number
  squad: readonly CareerPlayer[]
  rows: SlotFitRow[]
  tacticSource?: DataSource
  gameDate?: string
  pending?: boolean
  exclude?: ReadonlySet<string>
  framed?: boolean
}) {
  const id = useId()
  const tagList = useQuery({ queryKey: ['tags', careerId], queryFn: () => endpoints.playerTags(careerId), retry: false })
  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const { jobs, similar } = useMemo(() => seasonJobs({ squad: [...squad], slots: toDeskSlots(rows), tags, gameDate }, { exclude }), [squad, rows, tags, gameDate, exclude])
  const [expanded, setExpanded] = useState<ActionKind>()

  const body: ReactNode = pending ? <Skeleton className="h-28" /> : jobs.length === 0 ? (
    <p className="text-sm text-ink-2">{squad.length < MIN_SQUAD ? 'Öneri için kadroda en az 11 oyuncu olmalı.' : 'Şu an acil bir iş yok.'}</p>
  ) : (
    <ol className="flex flex-col gap-2">
      {jobs.map((job, i) => {
        const more = similar[job.kind] ?? []
        const open = expanded === job.kind
        const listId = `${id}-${job.kind}`
        return (
          <li key={`${job.kind}-${job.title}`} className="glass-3 flex flex-col gap-2 p-2.5">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="font-display text-2xl font-bold leading-none text-accent">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{KIND_LABEL[job.kind]}</Chip>
                  <b className="text-sm">{job.title}</b>
                </div>
                <p className="mt-1 text-xs text-ink-2">{job.reason}</p>
                {more.length > 0 && (
                  <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setExpanded(open ? undefined : job.kind)}
                    className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">
                    +{more.length} benzer
                  </button>
                )}
              </div>
              <Link to={job.to} className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">Gör</Link>
            </div>
            {open && (
              <ul id={listId} aria-label={`Benzer işler · ${KIND_LABEL[job.kind]}`} className="flex flex-col gap-1 border-l border-[var(--glass-border)] pl-3 text-sm">
                {more.map((m) => (
                  <li key={m.title} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0">{m.title}</span>
                    <Link to={m.to} className="shrink-0 text-xs font-semibold text-accent underline-offset-2 hover:underline">Gör</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )

  // FAZ 6a-D: kaynak satır başına değil, panel başlığında: ana taktik → "Ana taktiğe göre", yoksa "Otomatik öneri".
  const source: DataSource | undefined = tacticSource?.kind === 'decision' ? { kind: 'decision', label: 'Ana taktiğe göre' } : tacticSource
  return framed ? <Panel title={TITLE} label={TITLE} source={source}>{body}</Panel> : <PlainSection source={source}>{body}</PlainSection>
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
