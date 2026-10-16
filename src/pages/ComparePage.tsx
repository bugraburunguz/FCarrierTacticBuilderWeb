import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AttributeRadar } from '../components/AttributeRadar'
import { FitResultCard } from '../components/FitResultCard'
import { RolePicker, type RoleSelection } from '../components/RolePicker'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Spinner } from '../components/ui'
import { bestIndexes, useCompare } from '../features/compare/useCompare'
import { ATTR_LABELS } from '../lib/format'
import { playStyleName } from '../lib/playstyles'
import { compareStore, MAX_COMPARE } from '../state/compareStore'

/** v2 karşılaştırma (v3: features/compare/CompareV3Page). Veri useCompare'de. */
export function ComparePage() {
  const [term, setTerm] = useState('')
  const [selection, setSelection] = useState<RoleSelection>({ position: 'ST', roleId: 'advanced_forward_attack', tags: [] })
  const { list, search, details, loaded, fit, names, hasGoalkeeper, groups } = useCompare(term, selection)

  return (
    <div className="space-y-4">
      <Card title={`Karşılaştırma listesi (${list.length}/${MAX_COMPARE})`}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Field label="Oyuncu ekle">
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Oyuncu adı (en az 2 harf)…" />
            </Field>
            <ul className="mt-2 space-y-1 text-sm">
              {(search.data?.items ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>
                    {p.name} <span className="text-muted">({p.overall} · {p.positions[0]})</span>
                  </span>
                  <Button
                    variant="secondary"
                    disabled={list.length >= MAX_COMPARE || compareStore.has(p.id)}
                    onClick={() => compareStore.add({ id: p.id, name: p.name, overall: p.overall, position: p.positions[0] ?? '' })}
                  >
                    Ekle
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Oyuncular ekranındaki “+” ile veya oyuncu detayından da ekleyebilirsin.</p>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {list.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm">
                <Link to={`/players/${c.id}`} className="hover:underline">{c.name}</Link>
                <b>{c.overall}</b>
                <button type="button" aria-label={`${c.name} çıkar`} className="text-muted hover:text-danger" onClick={() => compareStore.remove(c.id)}>×</button>
              </span>
            ))}
            {list.length > 0 && (
              <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => compareStore.clear()}>Listeyi temizle</button>
            )}
          </div>
        </div>
      </Card>
      {loaded.length > 0 && (
        <Card title="Profil radarı (üst üste)">
          <AttributeRadar series={loaded.map((d) => ({ name: d.summary.name, attrs: d.attrs }))} goalkeeper={hasGoalkeeper} />
        </Card>
      )}

      {list.length < 2 ? (
        <EmptyState>Karşılaştırmak için en az 2 oyuncu ekle.</EmptyState>
      ) : details.some((d) => d.isLoading) ? (
        <Spinner />
      ) : (
        <Card title="Yan yana karşılaştırma">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1 pr-3" />
                  {loaded.map((d) => (
                    <th key={d.summary.id} className="px-2 py-1 text-center">
                      <Link to={`/players/${d.summary.id}`} className="font-semibold text-accent hover:underline">{d.summary.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <InfoRow label="Genel" values={loaded.map((d) => d.summary.overall)} highlight />
                <InfoRow label="Potential*" values={loaded.map((d) => d.summary.potential ?? null)} highlight />
                <InfoRow label="Yaş" values={loaded.map((d) => d.summary.age ?? null)} />
                <InfoRow label="Mevki" values={loaded.map((d) => d.summary.positions.slice(0, 3).join(', '))} />
                <InfoRow label="AcceleRATE" values={loaded.map((d) => d.summary.accelerate ?? '—')} />
                <InfoRow label="Zayıf ayak" values={loaded.map((d) => d.weakFoot ?? null)} highlight />
                <InfoRow label="Hareket" values={loaded.map((d) => d.skillMoves ?? null)} highlight />
                {groups.map((group) => (
                  <GroupRows key={group.title} title={group.title} attrs={group.attrs} loaded={loaded} />
                ))}
                <tr className="border-t border-line">
                  <td className="py-2 pr-3 text-xs font-semibold uppercase text-muted">PlayStyle</td>
                  {loaded.map((d) => (
                    <td key={d.summary.id} className="px-2 py-2 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {Object.entries(d.playstyles).map(([ps, lvl]) => (
                          <Pill key={ps} tone={lvl >= 2 ? 'amber' : 'slate'}>{playStyleName(ps, lvl)}</Pill>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {list.length >= 2 && (
        <Card title="Role göre uyum sıralaması">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="space-y-3">
              <RolePicker value={selection} onChange={setSelection} />
              <Button className="w-full" disabled={!selection.roleId || fit.isPending} onClick={() => fit.mutate()}>
                {fit.isPending ? 'Hesaplanıyor…' : 'Uyumu hesapla'}
              </Button>
              <ErrorBox error={fit.error} />
            </div>
            <div className="space-y-3">
              {!fit.data ? (
                <EmptyState>Bir rol seçip uyumu hesapla; en uygun oyuncu en üstte çıkar.</EmptyState>
              ) : (
                fit.data.map((result, index) => (
                  <Card key={result.roleFit.playerId} title={<span>{index + 1}. {names.get(result.roleFit.playerId) ?? result.roleFit.playerName} <BadgeDot state={result.roleFit.badge} /></span>}>
                    <FitResultCard result={result} compact={index > 0} />
                  </Card>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

type Cell = number | string | null

function InfoRow({ label, values, highlight }: { label: string; values: Cell[]; highlight?: boolean }) {
  const best = highlight ? bestIndexes(values) : new Set<number>()
  return (
    <tr className="border-t border-line">
      <td className="py-1 pr-3 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-2 py-1 text-center tabular-nums ${best.has(i) ? 'font-bold text-accent' : ''}`}>
          {v ?? '—'}
        </td>
      ))}
    </tr>
  )
}

function GroupRows({ title, attrs, loaded }: { title: string; attrs: string[]; loaded: { summary: { id: number }; attrs: Record<string, number> }[] }) {
  return (
    <>
      <tr>
        <td colSpan={loaded.length + 1} className="pt-3 text-xs font-semibold uppercase text-muted">{title}</td>
      </tr>
      {attrs.map((a) => (
        <InfoRow key={a} label={ATTR_LABELS[a] ?? a} values={loaded.map((d) => d.attrs[a] ?? null)} highlight />
      ))}
    </>
  )
}
