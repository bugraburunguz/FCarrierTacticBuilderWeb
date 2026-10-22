import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CareerPlayer, Formation } from '../../api/types'
import { Chip, EmptyState, Panel, type DataSource } from '../../design/components/primitives'
import type { PositionNeed } from '../../lib/depth'
import { ageProfile, type PositionGroup } from '../../lib/deskRules'
import { DepthMap } from '../squad/kadro/DepthMap'
import { contractTimeline, groupRoster, type GroupRoster } from './careerSquadRules'

const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const decimal = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })

function GroupSection({ roster, open, onToggle, focus }: { roster: GroupRoster; open: boolean; onToggle: () => void; focus: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focus) {
      ref.current?.focus()
      ref.current?.scrollIntoView?.({ block: 'center' })
    }
  }, [focus])
  const panelId = `grup-${roster.group}`
  return (
    <li className="glass-3 rounded-[var(--radius-sm)]">
      <button ref={ref} type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="flex flex-wrap items-center gap-2">
          {roster.label}
          <span className="font-[var(--font-num)] tabular-nums text-ink-2">{roster.have}/{roster.need}</span>
          {roster.short > 0 ? <Chip tone="bad">{roster.short} eksik</Chip> : <Chip tone="good">Yeterli</Chip>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col gap-1 px-3 pb-3 text-sm">
          {roster.players.length === 0 && <li className="text-ink-2">Bu grupta oyuncu yok.</li>}
          {roster.players.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-2">
              <Link to={`/players/${p.id}`} className="min-w-0 truncate underline-offset-2 hover:underline">{p.name}</Link>
              <span className="shrink-0 text-xs text-ink-2">{p.position} · <b className="font-[var(--font-num)] tabular-nums text-ink">{p.overall}</b>{p.age ? ` · ${p.age} yaş` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Yaş profili (tek seri): erişilebilir özet + ekran okuyucu tablosu; her çubukta sayı yazılı, renk anlam taşımaz (dataviz). */
function AgeHistogram({ squad }: { squad: CareerPlayer[] }) {
  const { average, buckets } = ageProfile(squad)
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const summary = `Yaş profili: ortalama ${decimal(average)}; ${buckets.map((b) => `${b.label}: ${b.count}`).join(', ')}`
  return (
    <figure className="flex flex-col gap-2">
      <div role="img" aria-label={summary} className="flex h-40 items-end gap-0.5 border-b border-[var(--glass-border)]">
        {buckets.map((b) => (
          <div key={b.label} title={`${b.label} yaş: ${b.count} oyuncu`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span aria-hidden="true" className="font-[var(--font-num)] text-xs tabular-nums text-ink">{b.count}</span>
            <span aria-hidden="true" className="w-full max-w-12 rounded-t-[4px] bg-[var(--accent)]" style={{ height: `${(b.count / max) * 80}%`, minHeight: b.count > 0 ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-0.5">
        {buckets.map((b) => <span key={b.label} className="min-w-0 flex-1 text-center text-xs text-ink-2">{b.label}</span>)}
      </div>
      <figcaption className="text-xs text-ink-2">Ortalama yaş <b className="font-[var(--font-num)] tabular-nums text-ink">{decimal(average)}</b></figcaption>
      <table className="sr-only">
        <caption>Yaş profili</caption>
        <thead><tr><th scope="col">Yaş</th><th scope="col">Oyuncu</th></tr></thead>
        <tbody>{buckets.map((b) => <tr key={b.label}><th scope="row">{b.label}</th><td>{b.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

function ContractTimeline({ squad, gameDate }: { squad: CareerPlayer[]; gameDate?: string }) {
  const lanes = contractTimeline(squad, gameDate)
  if (lanes.length === 0) {
    return <EmptyState>Sözleşme verisi yok: Live Editor içe aktarmasıyla gelir.</EmptyState>
  }
  return (
    <ol className="flex flex-col gap-3 border-l border-[var(--glass-border)] pl-3">
      {lanes.map((lane) => (
        <li key={lane.year} className="flex flex-col gap-1">
          <h3 className="font-[var(--font-num)] text-sm font-semibold tabular-nums">{lane.year}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {lane.players.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-[var(--font-num)] text-xs tabular-nums text-muted">{DATE.format(new Date(`${p.until}T00:00:00Z`))}</span>
                <Link to={`/players/${p.id}?sekme=sozlesme`} className="underline-offset-2 hover:underline">{p.name}</Link>
                {p.months !== undefined && <span className="text-xs text-ink-2">{p.months} ay</span>}
                {p.soon && <Chip tone="warn"><AlertTriangle size={12} aria-hidden="true" className="mr-1 inline" />6 ay içinde</Chip>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

/**
 * Derinlik sekmesi (KARIYER-UX FAZ 3, 15 §4.2): mevki grubunda kim/kaç (Masa derinlik işiyle aynı eşik), mevki yoğunluk haritası
 * (ana taktiğe göre), yaş profili ve sözleşme bitiş zaman çizgisi. `?grup=` o grubu açık ve odaklı getirir (Masa'nın derinlik bağlantısı).
 */
export function DepthTab({ squad, needs, formation, wanted, gameDate, record }: {
  squad: CareerPlayer[]
  needs: PositionNeed[]
  formation?: Formation
  wanted?: PositionGroup
  gameDate?: string
  record?: DataSource
}) {
  const roster = groupRoster(squad)
  const [open, setOpen] = useState<Set<PositionGroup>>(() => new Set(wanted ? [wanted] : roster.map((r) => r.group)))
  const toggle = (group: PositionGroup) => setOpen((cur) => {
    const next = new Set(cur)
    if (next.has(group)) {
      next.delete(group)
    } else {
      next.add(group)
    }
    return next
  })
  if (squad.length === 0) {
    return <EmptyState>Kadro boş.</EmptyState>
  }
  return (
    <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
      <Panel title="Mevki grupları" label="Mevki grupları" source={record}>
        <ul className="flex flex-col gap-2">
          {roster.map((r) => <GroupSection key={r.group} roster={r} open={open.has(r.group)} onToggle={() => toggle(r.group)} focus={r.group === wanted} />)}
        </ul>
      </Panel>
      <Panel title="Mevki yoğunluğu" label="Mevki yoğunluğu" source={record}>
        <DepthMap squad={squad} needs={needs} formation={formation} />
      </Panel>
      <Panel title="Yaş profili" label="Yaş profili grafiği" source={record}>
        <AgeHistogram squad={squad} />
      </Panel>
      <Panel title="Sözleşme bitişleri" label="Sözleşme bitişleri" source={record}>
        <ContractTimeline squad={squad} gameDate={gameDate} />
      </Panel>
    </div>
  )
}
