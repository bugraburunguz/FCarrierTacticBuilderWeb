import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer } from '../../api/types'
import { Chip, EmptyState, Panel, type DataSource } from '../../design/components/primitives'
import { deskLink } from '../../lib/deskLinks'
import { ageProfile, GROUP_LABEL, type PositionGroup } from '../../lib/deskRules'
import type { SlotFitRow } from '../squad/useSlotFits'
import { DevelopmentRecommendations } from '../growth/DevelopmentRecommendations'
import { SLOT_URGENCY_LABEL, slotDepth, type DepthCell, type DepthSlot, type SlotDepthRow, type SlotUrgency } from '../../lib/slotDepth'
import { ageBands, contractTimeline, slotForGroup, YOUTH_MAX_AGE } from './careerSquadRules'

const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const decimal = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
const LINK = 'inline-flex min-h-8 items-center text-xs font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11'
/** Renk yalnız destekler: yedek yok (kötü), diğerleri uyarı; metin her zaman yazılı. */
const URGENCY_TONE: Record<SlotUrgency, 'bad' | 'warn'> = { NO_BACKUP: 'bad', YOUTH_ONLY: 'warn', OLD_STARTER: 'warn', QUALITY_GAP: 'warn' }
const COLUMNS: { key: 'starter' | 'backup' | 'youth'; label: string }[] = [
  { key: 'starter', label: 'İlk 11' },
  { key: 'backup', label: 'Yedek' },
  { key: 'youth', label: `Genç (≤${YOUTH_MAX_AGE})` },
]

function Cell({ label, value, note }: { label: string; value?: DepthCell; note?: string }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-ink-2">{label}</span>
      {value ? (
        <span className="flex min-w-0 items-center text-sm">
          <Link to={value.academy ? deskLink.academy(value.id) : `/players/${value.id}`}
            className="inline-flex min-h-8 min-w-0 items-center truncate underline-offset-2 hover:underline max-sm:min-h-11">{value.name}</Link>
          <span className="shrink-0 font-[var(--font-num)] tabular-nums text-ink-2">&nbsp;· {value.overall ?? '–'}{value.age ? ` · ${value.age}` : ''}</span>
        </span>
      ) : <span className="text-sm text-muted">Yok</span>}
      {note && <span className="text-xs text-warn">{note}</span>}
    </div>
  )
}

/** Altyapı verisinin durumu: hazır değilken "Yedek yok" gösterilmez (altyapı genç ekleyebilir). */
type AcademyState = 'ready' | 'loading' | 'error'

/** Slot satırı: mevki, tek aciliyet metni, üç kolon ve eylemler ("Transferde aday bul", altyapıda aday varsa "Altyapıda: {ad}"). */
function SlotRow({ row: raw, focus, academy }: { row: SlotDepthRow; focus: boolean; academy: AcademyState }) {
  const row = academy !== 'ready' && raw.urgency === 'NO_BACKUP' ? { ...raw, urgency: undefined } : raw
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (focus) {
      ref.current?.focus()
      ref.current?.scrollIntoView?.({ block: 'center' })
    }
  }, [focus])
  return (
    <li ref={ref} tabIndex={-1} aria-label={`${row.slotId} slotu`} aria-current={focus || undefined}
      className={`glass-3 flex flex-col gap-2 rounded-[var(--radius-sm)] p-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${focus ? 'ring-1 ring-[var(--accent)]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{row.position}{row.slotId !== row.position && <span className="font-normal text-ink-2"> · {row.slotId}</span>}</h3>
        {row.urgency && <Chip tone={URGENCY_TONE[row.urgency]}>{SLOT_URGENCY_LABEL[row.urgency]}</Chip>}
      </div>
      <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-3">
        {COLUMNS.map((c) => <Cell key={c.key} label={c.label} value={row[c.key]} note={c.key === 'youth' && academy === 'error' ? 'Altyapı yüklenemedi'
          : c.key === 'backup' && (row.backupSlots ?? 0) > 1 ? `${row.backupSlots} slotta yedek` : undefined} />)}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link to={deskLink.candidate(row.slotId, row.position, row.roleId)} className={LINK}>Transferde aday bul</Link>
        {row.academyName && <Link to="/career/academy" className={LINK}>Altyapıda: {row.academyName}</Link>}
      </div>
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
      {/* KARIYER-UX 6: gençleştirme stratejisi için bant özeti (genç / prime / tecrübeli), sayı ve oran yazılı. */}
      <ul aria-label="Yaş bantları" className="grid grid-cols-3 gap-2">
        {ageBands(squad).map((b) => (
          <li key={b.key} className="glass-3 flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-sm)] p-2">
            <span className="text-xs font-semibold text-ink">{b.label}</span>
            <span className="text-xs text-ink-2">
              {b.range} · <b className="font-[var(--font-num)] tabular-nums text-ink">{b.count}</b> oyuncu · <span className="font-[var(--font-num)] tabular-nums">%{Math.round(b.share * 100)}</span>
            </span>
          </li>
        ))}
      </ul>
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
 * Derinlik sekmesi (GT-b): "Hangi mevkide yedek sorunum var?" — ana taktiğin (yoksa başlangıç önerisinin, "Otomatik öneri") 11 slotu × İlk 11 · Yedek ·
 * Genç (≤ 21, altyapı dahil), satır başına tek aciliyet metni; yaş profili ve sözleşme bitişleri. Eski `?grup=` o grubun ilk slot satırına odaklanır.
 */
export function DepthTab({ squad, slots, auto = false, wanted, wantedSlot, gameDate, record, careerId, tacticRows = [], tacticPending = false }: {
  squad: CareerPlayer[]
  /** GT-b: ana taktiğin (yoksa başlangıç önerisinin) slotları ve dizilen oyuncular; auto → "Otomatik öneri". */
  slots: DepthSlot[]
  auto?: boolean
  /** FIT-3 madde 11: kompakt gelişim planı önerileri için (zayıf slotlar ana taktik satırlarından). */
  careerId?: number
  tacticRows?: SlotFitRow[]
  tacticPending?: boolean
  /** Eski `?grup=` bağlantısı: o grubun ilk slot satırına odak. */
  wanted?: PositionGroup
  /** Masa'nın derinlik işi `?slot=`: o slot satırına odak. */
  wantedSlot?: string
  gameDate?: string
  record?: DataSource
}) {
  // Altyapı Genç kolonuna girer (≤ 21 kadro gençleriyle birlikte); Altyapı ekranıyla aynı anahtar.
  const academy = useQuery({ queryKey: ['academy', careerId], queryFn: () => endpoints.academy(careerId!), enabled: careerId !== undefined, staleTime: 300_000 })
  const rows = slotDepth(slots, squad, academy.data?.players ?? [])
  const bySlot = wantedSlot && slots.some((s) => s.slotId === wantedSlot) ? wantedSlot : undefined
  const focusSlot = bySlot ?? slotForGroup(slots, wanted)
  const academyState: AcademyState = academy.isError ? 'error' : academy.data || careerId === undefined ? 'ready' : 'loading'
  // Eski ?grup= bağlantısında formasyonda o gruptan slot yoksa (ör. dar 4-1-2-1-2'de kanat) kısa not.
  const missingGroup = !bySlot && wanted && slots.length > 0 && !focusSlot ? wanted : undefined
  if (squad.length === 0) {
    return <EmptyState>Kadro boş.</EmptyState>
  }
  return (
    <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
      {/* GT-b: "Hangi mevkide yedek sorunum var?" — Mevki grupları ve Mevki yoğunluğu yerine tek slot bazlı matris. */}
      <Panel title="Derinlik" label="Derinlik" source={record} className="min-[1100px]:col-span-2"
        actions={auto ? <Chip tone="info">Otomatik öneri</Chip> : undefined}>
        {missingGroup && <p role="status" className="mb-2 text-sm text-ink-2">Bu formasyonda {GROUP_LABEL[missingGroup].toLocaleLowerCase('tr-TR')} slotu yok.</p>}
        {rows.length === 0 ? <EmptyState>Ana taktik ya da başlangıç önerisi hazır olunca slotlar görünür.</EmptyState> : (
          <ul aria-label="Slot derinliği" className="flex flex-col gap-2">
            {rows.map((r) => <SlotRow key={r.slotId} row={r} focus={r.slotId === focusSlot} academy={academyState} />)}
          </ul>
        )}
      </Panel>
      <div className="min-[1100px]:col-span-2">
        <DevelopmentRecommendations careerId={careerId} rows={tacticRows} pending={tacticPending} compact />
      </div>
      <Panel title="Yaş profili" label="Yaş profili grafiği" source={record}>
        <AgeHistogram squad={squad} />
      </Panel>
      <Panel title="Sözleşme bitişleri" label="Sözleşme bitişleri" source={record}>
        <ContractTimeline squad={squad} gameDate={gameDate} />
      </Panel>
    </div>
  )
}
