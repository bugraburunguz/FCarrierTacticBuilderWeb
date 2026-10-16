import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { FitRoleResult, PlayerDetail } from '../../api/types'
import { AttributeRadar } from '../../components/AttributeRadar'
import { FitBadge } from '../../components/card/FitBadge'
import { RolePicker, type RoleSelection } from '../../components/RolePicker'
import { ErrorBox, Input } from '../../components/ui'
import { useIsMobile } from '../../design/components/MobileSheet'
import { PageHeader } from '../../design/components/PageHeader'
import { Button, Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../design/components/primitives'
import { fitDisplay, rolePointsText } from '../../lib/fitLabels'
import { ATTR_LABELS } from '../../lib/format'
import { playStyleName } from '../../lib/playstyles'
import { compareStore, MAX_COMPARE } from '../../state/compareStore'
import { bestIndexes, useCompare, type CompareCell } from './useCompare'

const NUM = 'font-[var(--font-num)] tabular-nums'

interface Row { label: string; values: CompareCell[]; highlight?: boolean }

function rowsOf(loaded: PlayerDetail[], groups: { title: string; attrs: string[] }[]): { title?: string; rows: Row[] }[] {
  const info: Row[] = [
    { label: 'Genel', values: loaded.map((d) => d.summary.overall), highlight: true },
    { label: 'Potansiyel*', values: loaded.map((d) => d.summary.potential ?? null), highlight: true },
    { label: 'Yaş', values: loaded.map((d) => d.summary.age ?? null) },
    { label: 'Mevki', values: loaded.map((d) => d.summary.positions.slice(0, 3).join(', ')) },
    { label: 'AcceleRATE', values: loaded.map((d) => d.summary.accelerate ?? null) },
    { label: 'Zayıf ayak', values: loaded.map((d) => d.weakFoot ?? null), highlight: true },
    { label: 'Hareket', values: loaded.map((d) => d.skillMoves ?? null), highlight: true },
  ]
  return [{ rows: info }, ...groups.map((g) => ({ title: g.title, rows: g.attrs.map((a) => ({ label: ATTR_LABELS[a] ?? a, values: loaded.map((d) => d.attrs[a] ?? null), highlight: true })) }))]
}

function Value({ value, best }: { value: CompareCell; best: boolean }) {
  return <span className={best ? 'font-semibold text-accent' : ''}>{value ?? '–'}{best && <span className="sr-only"> (en iyi)</span>}</span>
}

function SideBySide({ loaded, sections }: { loaded: PlayerDetail[]; sections: { title?: string; rows: Row[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="Yan yana karşılaştırma" className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-2">
            <th scope="col" className="py-1.5 pr-3"><span className="sr-only">Özellik</span></th>
            {loaded.map((d) => <th scope="col" key={d.summary.id} className="px-2 text-center"><Link to={`/players/${d.summary.id}`} className="font-semibold text-ink hover:underline">{d.summary.name}</Link></th>)}
          </tr>
        </thead>
        <tbody>
          {sections.map((s, i) => (
            <SectionRows key={s.title ?? i} title={s.title} rows={s.rows} span={loaded.length + 1} />
          ))}
          <tr className="border-t border-[var(--glass-border)]">
            <th scope="row" className="py-2 pr-3 text-left text-xs font-semibold text-ink-2">PlayStyle</th>
            {loaded.map((d) => (
              <td key={d.summary.id} className="px-2 py-2 text-center">
                <span className="flex flex-wrap justify-center gap-1">{Object.entries(d.playstyles).map(([ps, lvl]) => <Chip key={ps} tone={lvl >= 2 ? 'warn' : undefined}>{playStyleName(ps, lvl)}</Chip>)}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SectionRows({ title, rows, span }: { title?: string; rows: Row[]; span: number }) {
  return (
    <>
      {title && <tr><th scope="colgroup" colSpan={span} className="pt-3 text-left text-xs font-semibold text-ink-2">{title}</th></tr>}
      {rows.map((r) => {
        const best = r.highlight ? bestIndexes(r.values) : new Set<number>()
        return (
          <tr key={r.label} className="border-t border-[var(--glass-border)]">
            <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ink-2">{r.label}</th>
            {r.values.map((v, i) => <td key={i} data-best={best.has(i) ? 'true' : undefined} className={`px-2 text-center ${NUM}`}><Value value={v} best={best.has(i)} /></td>)}
          </tr>
        )
      })}
    </>
  )
}

/** Mobil: her oyuncu kendi bölümünde; değer, satırdaki en iyiyse vurgulu (diğer oyunculara göre). */
function Stacked({ loaded, sections }: { loaded: PlayerDetail[]; sections: { title?: string; rows: Row[] }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {loaded.map((d, p) => (
        <section key={d.summary.id} aria-label={d.summary.name} className="glass-3 rounded-[var(--radius-sm)] p-3">
          <h3 className="mb-2 font-semibold"><Link to={`/players/${d.summary.id}`} className="hover:underline">{d.summary.name}</Link></h3>
          {sections.map((s, i) => (
            <div key={s.title ?? i} className="mb-2">
              {s.title && <p className="text-xs font-semibold text-ink-2">{s.title}</p>}
              <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-sm min-[480px]:grid-cols-2">
                {s.rows.map((r) => {
                  const best = r.highlight ? bestIndexes(r.values) : new Set<number>()
                  return (
                    <div key={r.label} className="flex min-w-0 justify-between gap-2 border-b border-[var(--glass-border)] py-0.5">
                      <dt className="shrink-0 text-ink-2">{r.label}</dt>
                      <dd data-best={best.has(p) ? 'true' : undefined} className={`min-w-0 break-words text-right ${NUM}`}><Value value={r.values[p]} best={best.has(p)} /></dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/** Rol uyumu satırı: sıra ve "Rol puanı" ham rol puanından (sunucu sırası); rozet ve yüzdesi seviyesinden (fitDisplay, V3-07c 0a). */
function FitRow({ rank, name, result }: { rank: number; name: string; result: FitRoleResult }) {
  const d = fitDisplay(result.roleFit)
  return (
    <li className="glass-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-sm)] p-2.5 text-sm">
      <span className={`w-6 text-ink-2 ${NUM}`}>{rank}.</span>
      <span className="min-w-0 flex-1 font-semibold">{name}</span>
      <span className={NUM}>{rolePointsText(d.rolePoints)}</span>
      <FitBadge state={d.state} pct={d.pct} />
      <span className="w-full pl-9 text-xs text-ink-2">Bu rolde ≈ {result.roleFit.projectedRating} oynar{result.roleFit.outOfPosition ? ' · mevki dışı' : ''}{result.intentFit ? ` · davranış uyumu %${Math.round(result.intentFit.score)}` : ''}</span>
    </li>
  )
}

/**
 * v3 Karşılaştır (/compare, V3-07c): liste + arama, üst üste profil radarı (seri renkleri token), masaüstünde yan yana tablo (en iyi değer işaretli),
 * mobilde oyuncu başına dikey bölüm; role göre uyum (sıra rol puanı, rozet seviyesinden).
 */
export function CompareV3Page() {
  const [term, setTerm] = useState('')
  const [selection, setSelection] = useState<RoleSelection>({ position: 'ST', roleId: 'advanced_forward_attack', tags: [] })
  const { list, search, details, loaded, fit, names, hasGoalkeeper, groups } = useCompare(term, selection)
  const mobile = useIsMobile()
  const failed = details.some((d) => d.isError)
  const sections = rowsOf(loaded, groups)
  let body: ReactNode
  if (list.length < 2) {
    body = <EmptyState>Karşılaştırmak için en az 2 oyuncu ekle.</EmptyState>
  } else if (failed) {
    body = <ErrorState message="Oyuncu verisi yüklenemedi." onRetry={() => details.forEach((d) => d.isError && d.refetch())} />
  } else if (details.some((d) => d.isLoading)) {
    body = <Skeleton className="h-64" />
  } else {
    body = mobile ? <Stacked loaded={loaded} sections={sections} /> : <SideBySide loaded={loaded} sections={sections} />
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2">
      <PageHeader title="Karşılaştır" subtitle={`En fazla ${MAX_COMPARE} oyuncu; oyuncular listesindeki “+” ile de eklenir.`} />
      <Panel title={`Liste (${list.length}/${MAX_COMPARE})`}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">Oyuncu ekle<Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Oyuncu adı (en az 2 harf)" /></label>
            <ul className="divide-y divide-[var(--glass-border)] text-sm">
              {(search.data?.items ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">{p.name} <span className="text-ink-2">{p.overall} · {p.positions[0]}</span></span>
                  <Button aria-label={`${p.name} ekle`} disabled={list.length >= MAX_COMPARE || compareStore.has(p.id)} onClick={() => compareStore.add({ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' })}>Ekle</Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {list.map((c) => (
              <span key={c.id} className="glass-3 inline-flex min-h-8 items-center gap-2 rounded-full pl-3 text-sm">
                <Link to={`/players/${c.id}`} className="hover:underline">{c.name}</Link>
                <b className={NUM}>{c.overall}</b>
                <button type="button" aria-label={`${c.name} çıkar`} className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--glass-hover)] hover:text-bad max-sm:size-11" onClick={() => compareStore.remove(c.id)}><X size={14} aria-hidden="true" /></button>
              </span>
            ))}
            {list.length > 0 && <Button variant="ghost" onClick={() => compareStore.clear()}>Listeyi temizle</Button>}
          </div>
        </div>
      </Panel>
      {loaded.length > 0 && (
        <Panel title="Profil radarı"><AttributeRadar series={loaded.map((d) => ({ name: d.summary.name, attrs: d.attrs }))} goalkeeper={hasGoalkeeper} /></Panel>
      )}
      <Panel title="Yan yana">{body}</Panel>
      {list.length >= 2 && (
        <Panel title="Role göre uyum">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="flex flex-col gap-3">
              <RolePicker value={selection} onChange={setSelection} />
              <Button variant="primary" disabled={!selection.roleId || fit.isPending} onClick={() => fit.mutate()}>{fit.isPending ? 'Hesaplanıyor…' : 'Uyumu hesapla'}</Button>
              <ErrorBox error={fit.error} />
            </div>
            {!fit.data ? (
              <EmptyState>Bir rol seçip uyumu hesapla; rol puanı en yüksek oyuncu en üstte.</EmptyState>
            ) : (
              <ol aria-label="Role göre uyum" className="flex flex-col gap-2">
                {fit.data.map((r, i) => <FitRow key={r.roleFit.playerId} rank={i + 1} name={names.get(r.roleFit.playerId) ?? r.roleFit.playerName} result={r} />)}
              </ol>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
