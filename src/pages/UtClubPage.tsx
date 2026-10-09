import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FutCard } from '../components/FutCard'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { Card, EmptyState, Field, Input, Pill, Select } from '../components/ui'
import { POSITIONS } from '../lib/format'
import type { UtCard } from '../lib/utCard'
import { useUtCapture } from '../state/utCaptureStore'
import { utCardStore } from '../state/utCardStore'

type View = 'all' | 'club' | 'storage' | 'duplicate'

const VIEWS: { id: View; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: 'club', label: 'Kulüp / kadro' },
  { id: 'storage', label: 'SBC storage' },
  { id: 'duplicate', label: 'Duplicate' },
]
const PAGE = 100

const inView = (card: UtCard, view: View) =>
  view === 'all' ||
  (view === 'storage' && card.pile === 'storage') ||
  (view === 'club' && card.pile !== 'storage') ||
  (view === 'duplicate' && Boolean(card.duplicate))

export function UtClubPage() {
  const library = useMemo(() => utCardStore.get(), [])
  const capture = useUtCapture()
  const [view, setView] = useState<View>('all')
  const [q, setQ] = useState('')
  const [position, setPosition] = useState('')
  const [minRating, setMinRating] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [layout, setLayout] = useState<'cards' | 'table'>('cards')

  const owned = useMemo(() => (library?.cards ?? []).filter((c) => c.source === 'club'), [library])
  const starters = useMemo(() => new Set((capture?.activeSquad?.slots ?? []).filter((s) => s.card).map((s) => s.card!.instanceId)), [capture])
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, owned.filter((c) => inView(c, v.id)).length])) as Record<View, number>, [owned])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const min = Number(minRating) || 0
    return owned
      .filter((c) => inView(c, view) && (!needle || c.name.toLowerCase().includes(needle)) && (!position || c.positions.includes(position)) && c.rating >= min)
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
  }, [owned, view, q, position, minRating])

  if (owned.length === 0) {
    return (
      <Card title="Kadrom">
        <EmptyState>
          Henüz kulüp kartı yok. <Link to="/ut/import" className="text-accent underline">Kulüp içe aktar</Link> sayfasından yakalama dosyanı yükle; tüm oyuncuların ve SBC storage burada listelenir.
        </EmptyState>
      </Card>
    )
  }
  const total = rows.reduce((sum, c) => sum + (c.price ?? 0), 0)
  const missingPile = owned.every((c) => c.pile === undefined)

  return (
    <div className="space-y-4">
      <Card title={`Kadrom · ${owned.length} kart`}>
        <div role="tablist" aria-label="Görünüm" className="mb-3 flex flex-wrap gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => {
                setView(v.id)
                setLimit(PAGE)
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${view === v.id ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-ink hover:bg-line'}`}
            >
              {v.label} <span className="tabular-nums opacity-80">{counts[v.id]}</span>
            </button>
          ))}
        </div>
        {missingPile && (
          <p className="mb-2 rounded-lg border border-danger-line bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
            Bu kayıt eski sürümden: storage ve duplicate bilgisi yok. Yakalama dosyanı Kulüp içe aktar'dan yeniden yükle.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="İsim">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Oyuncu ara…" />
          </Field>
          <Field label="Mevki">
            <Select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">Hepsi</option>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Min. rating">
            <Input type="number" min={40} max={99} value={minRating} onChange={(e) => setMinRating(e.target.value)} />
          </Field>
          <div className="flex items-end justify-between gap-2 text-xs text-muted">
            <span>{rows.length} kart · değer {total.toLocaleString('tr-TR')} coin</span>
            <span className="flex gap-1">
              {(['cards', 'table'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLayout(l)} className={`rounded-full px-2.5 py-1 font-semibold ${layout === l ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-ink'}`}>{l === 'cards' ? 'Kart' : 'Tablo'}</button>
              ))}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        {layout === 'cards' && (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] justify-items-center gap-3">
            {rows.slice(0, limit).map((c) => (
              <li key={c.key} className="relative">
                <FutCard name={c.name} rating={c.rating} position={c.positions[0]} faceUrl={c.faceUrl} cardType={c.cardType} rarity={c.rarity} nationality={c.nationality} club={c.club} league={c.league} width={104} />
                <span className="absolute left-0 top-0 flex flex-col gap-0.5">
                  {c.pile === 'storage' && <Pill tone="sky">storage</Pill>}
                  {c.duplicate && <Pill tone="amber">dup</Pill>}
                  {c.instanceId !== undefined && starters.has(c.instanceId) && <Pill tone="slate">kadro</Pill>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {layout === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-1 pr-2">Oyuncu</th>
                <th className="pr-2 text-right">OVR</th>
                <th className="pr-2">Mevki</th>
                <th className="pr-2">Tür</th>
                <th className="pr-2">Kulüp</th>
                <th className="pr-2">Lig</th>
                <th className="pr-2 text-right">Değer</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((c) => (
                <tr key={c.key} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-medium">
                    <span className="flex items-center gap-2">
                      <PlayerAvatar name={c.name} position={c.positions[0]} size={24} />
                      {c.name}
                    </span>
                  </td>
                  <td className="pr-2 text-right font-semibold tabular-nums">{c.rating}</td>
                  <td className="pr-2">{c.positions.slice(0, 3).join(', ')}</td>
                  <td className="pr-2">{c.rarity ?? '—'}</td>
                  <td className="pr-2">{c.club ?? '—'}</td>
                  <td className="pr-2">{c.league ?? '—'}</td>
                  <td className="pr-2 text-right tabular-nums">{c.price !== undefined ? c.price.toLocaleString('tr-TR') : '—'}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {c.pile === 'storage' && <Pill tone="sky">storage</Pill>}
                    {c.duplicate && <Pill tone="amber">duplicate</Pill>}
                    {c.untradeable && <Pill tone="emerald">untradeable</Pill>}
                    {c.instanceId !== undefined && starters.has(c.instanceId) && <Pill tone="slate">aktif kadro</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {rows.length > limit && (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mt-3 w-full rounded-lg bg-surface-2 py-2 text-sm font-medium text-ink hover:bg-line">
            Daha fazla göster ({rows.length - limit} kart daha)
          </button>
        )}
        {rows.length === 0 && <EmptyState>Bu filtrelerle kart yok.</EmptyState>}
        <p className="mt-2 text-xs text-muted">Değer: pazar ortalaması, yoksa son satış fiyatı. SBC çözücü önce storage ve duplicate kartları, sonra kadrodaki kartları (değerine göre), en son marketi kullanır.</p>
      </Card>
    </div>
  )
}
