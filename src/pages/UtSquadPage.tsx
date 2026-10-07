import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { TacticRequest, WeaponState } from '../api/types'
import { PitchView } from '../components/PitchView'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Pill, Select, Spinner } from '../components/ui'
import { MAX_SQUAD_CHEM, squadChemistry } from '../lib/chemistry'
import { carryOver, fromSummary, priceSummary, type CardSource, type UtCard } from '../lib/utCard'
import { utCardStore } from '../state/utCardStore'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']
const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const
const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }
const SOURCE_LABEL: Record<CardSource, string> = { club: 'Kulübüm', market: 'Market', catalog: 'Katalog' }
const MAX_LISTED = 60

interface Setup {
  buildUp: (typeof BUILD_UPS)[number]
  depth: number
}

function coins(value?: number) {
  return value === undefined ? '—' : value.toLocaleString('tr-TR')
}

function shortCoins(value?: number) {
  if (value === undefined) {
    return '—'
  }
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)
}

export function UtSquadPage() {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: 600_000 })
  const [formationId, setFormationId] = useState('4-2-3-1 (2)')
  const [setup, setSetup] = useState<Setup>({ buildUp: 'Balanced', depth: 55 })
  const [picked, setPicked] = useState<Record<string, UtCard>>({})
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string>()
  const [picking, setPicking] = useState(false)

  const formation = formations.data?.find((f) => f.id === formationId) ?? formations.data?.[0]
  const slots = formation?.slots ?? []

  const tactic: TacticRequest = useMemo(
    () => ({
      formation: formation?.id,
      slots: Object.entries(roleOverride).map(([slotId, roleId]) => ({ slotId, tags: [], roleId })),
      setup,
    }),
    [formation?.id, roleOverride, setup],
  )
  const resolved = useQuery({
    queryKey: ['ut-resolve', JSON.stringify(tactic)],
    queryFn: () => endpoints.resolveTactic(tactic),
    enabled: Boolean(formation),
    retry: false,
  })
  const roleBySlot = Object.fromEntries((resolved.data?.slots ?? []).map((s) => [s.slotId, s]))

  const pickedSlots = slots.filter((s) => picked[s.slotId] && roleBySlot[s.slotId])
  const evaluationBody = pickedSlots.map((s) => {
    const card = picked[s.slotId]
    return {
      slotId: s.slotId,
      position: s.position,
      roleId: roleBySlot[s.slotId].roleId,
      ...(card.attrs
        ? { card: { name: card.name, overall: card.rating, positions: card.positions, attrs: card.attrs } }
        : { playerId: card.playerId }),
    }
  })
  const evaluation = useQuery({
    queryKey: ['ut-evaluate', JSON.stringify(evaluationBody), setup.buildUp, setup.depth],
    queryFn: () => endpoints.utSquadEvaluate({ slots: evaluationBody, setup }),
    enabled: evaluationBody.length > 0 && evaluationBody.every((b) => 'card' in b || b.playerId !== undefined),
    retry: false,
    staleTime: 60_000,
  })
  const evalBySlot = Object.fromEntries((evaluation.data?.slots ?? []).map((e) => [e.slotId, e]))

  const chem = useMemo(
    () =>
      squadChemistry(
        slots.map((s, i) => {
          const p = picked[s.slotId]
          return {
            position: s.position,
            card: p ? { id: i, gender: p.gender, club: p.club, league: p.league, nationality: p.nationality, positions: p.positions, cardType: p.cardType } : undefined,
          }
        }),
      ),
    [slots, picked],
  )
  const price = priceSummary(slots.map((s) => picked[s.slotId]))

  const info = Object.fromEntries(
    slots.map((s, i) => {
      const p = picked[s.slotId]
      const e = evalBySlot[s.slotId]
      return [s.slotId, { title: p?.name, subtitle: p ? `${e ? `meta ${Math.round(e.card.metaRating)}` : p.rating} · k${chem.perSlot[i]} · ${shortCoins(p.price)}` : undefined, badge: p ? (e?.badge ?? CHEM_BADGE[chem.perSlot[i]]) : undefined }]
    }),
  )
  const active = slots.find((s) => s.slotId === selected)
  const activeIndex = active ? slots.indexOf(active) : -1
  const activeEval = active ? evalBySlot[active.slotId] : undefined
  const activeCard = active ? picked[active.slotId] : undefined
  const activeRoles = (roles.data ?? []).filter((r) => active && r.positions.includes(active.position)).sort((a, b) => a.name.localeCompare(b.name) || a.focus.localeCompare(b.focus))

  function changeFormation(id: string) {
    const next = formations.data?.find((f) => f.id === id)
    setPicked((cur) => carryOver(slots, cur, next?.slots ?? []))
    setFormationId(id)
    setRoleOverride({})
    setSelected(undefined)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,480px)_1fr]">
      <Card title="UT Taktik ve Kadro Kurucu">
        {formations.isLoading ? (
          <Spinner />
        ) : formations.error ? (
          <ErrorBox error={formations.error} />
        ) : (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <Field label={`Formasyon (${formations.data?.length ?? 0})`}>
                <Select value={formation?.id} onChange={(e) => changeFormation(e.target.value)}>
                  {(formations.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Build-Up">
                <Select value={setup.buildUp} onChange={(e) => setSetup((cur) => ({ ...cur, buildUp: e.target.value as Setup['buildUp'] }))}>
                  {BUILD_UPS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label={`Savunma hattı: ${setup.depth}`}>
                <Input type="range" min={0} max={100} value={setup.depth} onChange={(e) => setSetup((cur) => ({ ...cur, depth: Number(e.target.value) }))} />
              </Field>
            </div>
            <PitchView slots={slots} selected={selected} onSelect={setSelected} info={info} />
            <p className="mt-2 text-xs text-slate-500">Slota tıkla: rol ve focus seç, kart ata. Sahada: meta skor · kimya (k) · fiyat. Formasyon değiştirince kartlar aynı mevkideki slotlara taşınır.</p>
          </>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="Kadro özeti">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone={chem.total >= 30 ? 'emerald' : chem.total >= 20 ? 'amber' : 'rose'}>kimya {chem.total} / {MAX_SQUAD_CHEM}</Pill>
            <Pill tone="sky">meta* ort. {evaluation.data ? evaluation.data.averageMeta : '—'}</Pill>
            <Pill tone="slate">OVR ort. {evaluation.data ? evaluation.data.averageOverall : '—'}</Pill>
            <Pill tone="slate">{pickedSlots.length}/11 slot dolu</Pill>
            <Button variant="ghost" onClick={() => setPicked({})}>Kartları temizle</Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Pill tone="amber">ort. ücret {coins(price.average)}</Pill>
            <Pill tone="amber">toplam {coins(price.known > 0 ? price.total : undefined)}</Pill>
            <span className="text-xs text-slate-500">{price.known}/{price.count} kartın fiyatı biliniyor</span>
          </div>
          <Summary evaluation={evaluation.data?.slots ?? []} />
          <p className="mt-2 text-xs text-slate-500">
            Meta* platformun tahmin metriğidir; kendi kartlarında gerçek attribute'ları kullanılır. Fiyat: kulüp kartlarında pazar ortalaması (yoksa son satış), market ilanlarında satın alma fiyatı; katalog kartlarının fiyatı yoktur ve ortalamaya girmez. Fiyatlar senin oturumunda gördüğün değerlerdir.
          </p>
        </Card>

        {active ? (
          <Card title={`${active.slotId} · ${active.position}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rol ve focus">
                <Select
                  value={roleBySlot[active.slotId]?.roleId ?? ''}
                  onChange={(e) => setRoleOverride((cur) => ({ ...cur, [active.slotId]: e.target.value }))}
                >
                  {activeRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} · {r.focus}</option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end gap-2">
                <Button variant="secondary" onClick={() => setPicking(true)}>{activeCard ? `Kart: ${activeCard.name} (değiştir)` : 'Kart ata'}</Button>
                {activeCard && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setPicked((cur) => {
                        const { [active.slotId]: _removed, ...rest } = cur
                        return rest
                      })
                    }
                  >
                    Kaldır
                  </Button>
                )}
              </div>
            </div>
            {activeCard && (
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="text-xs text-slate-500">
                  {SOURCE_LABEL[activeCard.source]} · {activeCard.rating} OVR{activeCard.rarity ? ` · ${activeCard.rarity}` : ''}{activeCard.club ? ` · ${activeCard.club}` : ''} · fiyat {coins(activeCard.price)}
                  {activeCard.untradeable ? ' · untradeable' : ''}
                </p>
                {activeEval ? (
                  <>
                    <p>
                      Meta rating* <b className="text-lg tabular-nums">{activeEval.card.metaRating}</b> <Pill tone={TIER_TONE[activeEval.card.tier] ?? 'slate'}>{activeEval.card.tier}</Pill>
                      {' · '}Kimya <b>{'◆'.repeat(chem.perSlot[activeIndex])}{'◇'.repeat(3 - chem.perSlot[activeIndex])}</b>
                    </p>
                    {activeEval.roleFit !== undefined && (
                      <p className="flex items-center gap-1.5">
                        {activeEval.badge && <BadgeDot state={activeEval.badge} />} RoleFit <b>%{Math.round(activeEval.roleFit)}</b> · {activeEval.roleName}
                        {activeEval.setupDelta !== undefined && activeEval.setupDelta !== 0 && <span className="text-xs text-slate-500">(ayar {activeEval.setupDelta > 0 ? '+' : ''}{activeEval.setupDelta})</span>}
                      </p>
                    )}
                    {activeEval.reason && <p className="text-xs text-slate-500">{activeEval.reason}</p>}
                    {activeEval.card.chemStyles && (
                      <p className="text-xs">
                        Chem style önerisi: <b>{activeEval.card.bestChemStyle}</b>{' '}
                        {activeEval.card.chemStyles.filter((c) => c.style === activeEval.card.bestChemStyle).map((c) => `(meta ${c.metaRating}, +${c.delta})`)}
                      </p>
                    )}
                    {!activeCard.club && activeCard.source !== 'catalog' && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">Bu kartın kulüp/lig/ülke adı çözülemedi; kimya bağları hesaba katılmıyor olabilir.</p>
                    )}
                  </>
                ) : (
                  <Spinner />
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card><EmptyState>Sahada bir slota tıkla.</EmptyState></Card>
        )}

        <UtTacticCode
          tactic={tactic}
          onLoaded={(r) => {
            setFormationId(r.formation)
            setPicked({})
            setRoleOverride(Object.fromEntries(r.slots.map((s) => [s.slotId, s.roleId])))
            setSetup({ buildUp: (BUILD_UPS as readonly string[]).includes(r.buildUp) ? (r.buildUp as Setup['buildUp']) : 'Balanced', depth: r.depth })
          }}
        />
      </div>

      {picking && active && (
        <PickModal
          position={active.position}
          usedKeys={new Set(Object.values(picked).map((c) => c.key))}
          onClose={() => setPicking(false)}
          onPick={(card) => {
            setPicked((cur) => ({ ...cur, [active.slotId]: card }))
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

function Summary({ evaluation }: { evaluation: { slotId: string; badge?: WeaponState; badgeText?: string; roleName?: string }[] }) {
  const weak = evaluation.filter((e) => e.badge === 'RED')
  const strong = evaluation.filter((e) => e.badge === 'GREEN')
  if (evaluation.length === 0) {
    return null
  }
  return (
    <ul className="mt-2 space-y-0.5 text-sm">
      <li className="text-emerald-700 dark:text-emerald-400">+ Rolüne tam oturan: {strong.length}</li>
      {weak.length > 0 && <li className="text-rose-600 dark:text-rose-400">− Rolüne uymayan: {weak.map((w) => `${w.slotId} (${w.roleName})`).join(', ')}</li>}
    </ul>
  )
}

function UtTacticCode({ tactic, onLoaded }: { tactic: TacticRequest; onLoaded: (r: { formation: string; buildUp: string; depth: number; slots: { slotId: string; roleId: string }[] }) => void }) {
  const [input, setInput] = useState('')
  const resolved = useQuery({ queryKey: ['ut-resolve', JSON.stringify(tactic)], queryFn: () => endpoints.resolveTactic(tactic), retry: false })
  const exportRequest: TacticRequest | undefined = resolved.data
    ? { ...tactic, slots: resolved.data.slots.map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })) }
    : undefined
  const exportCode = useQuery({
    queryKey: ['ut-code', JSON.stringify(exportRequest)],
    queryFn: () => endpoints.exportTacticCode(exportRequest!),
    enabled: Boolean(exportRequest),
    retry: false,
    staleTime: 300_000,
  })
  const [copied, setCopied] = useState(false)
  const [importError, setImportError] = useState<unknown>()
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  async function load() {
    try {
      setImportError(undefined)
      onLoaded(await endpoints.importTacticCode(input.trim()))
    } catch (e) {
      setImportError(e)
    }
  }
  return (
    <Card title="EA taktik kodu">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input readOnly value={exportCode.data?.code ?? ''} placeholder={exportCode.isFetching ? 'Üretiliyor…' : '—'} className="font-mono" onFocus={(e) => e.currentTarget.select()} aria-label="EA taktik kodu" />
          <Button variant="secondary" disabled={!exportCode.data} onClick={() => exportCode.data && copy(exportCode.data.code)}>{copied ? 'Kopyalandı' : 'Kopyala'}</Button>
        </div>
        <p className="text-xs text-slate-500">Kod formasyon, rol, Build-Up ve hat değiştikçe otomatik güncellenir.</p>
        {exportCode.data?.warnings.map((w) => <p key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>)}
        <ErrorBox error={exportCode.error} />
        <div className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır" className="font-mono" maxLength={16} aria-label="EA kodunu yapıştır" />
          <Button disabled={!input.trim()} onClick={load}>Yükle</Button>
        </div>
        <ErrorBox error={importError} />
        <p className="text-xs text-slate-500">Kod mod-bağımsızdır: kariyerdeki taktik kodunun aynısı. Yüklemek formasyonu, rolleri, Build-Up'ı ve hattı değiştirir, kartları temizler.</p>
      </div>
    </Card>
  )
}

function PickModal({ position, usedKeys, onClose, onPick }: { position: string; usedKeys: Set<string>; onClose: () => void; onPick: (c: UtCard) => void }) {
  const library = useMemo(() => utCardStore.get(), [])
  const [source, setSource] = useState<CardSource>(library && library.cards.some((c) => c.source === 'club') ? 'club' : 'catalog')
  const [q, setQ] = useState('')
  const catalog = useQuery({
    queryKey: ['ut-pick', position, q],
    queryFn: () => endpoints.players({ pos: [position], q: q || undefined, sort: 'overall', order: 'desc', size: 20, gender: 0 }),
    enabled: source === 'catalog',
    staleTime: 60_000,
  })
  const local = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (library?.cards ?? [])
      .filter((c) => c.source === source && c.positions.includes(position) && (!needle || c.name.toLowerCase().includes(needle)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, MAX_LISTED)
  }, [library, source, position, q])
  const rows: UtCard[] = source === 'catalog' ? (catalog.data?.items ?? []).map(fromSummary) : local
  const counts: Record<CardSource, number> = {
    club: library?.cards.filter((c) => c.source === 'club').length ?? 0,
    market: library?.cards.filter((c) => c.source === 'market').length ?? 0,
    catalog: 0,
  }

  return (
    <Modal title={`${position} için kart seç`} onClose={onClose}>
      <div role="tablist" aria-label="Kart kaynağı" className="mb-3 flex gap-1">
        {(['club', 'market', 'catalog'] as CardSource[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={source === s}
            onClick={() => setSource(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${source === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
          >
            {SOURCE_LABEL[s]}{s !== 'catalog' ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>
      <Input autoFocus placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-80 overflow-y-auto">
        {source === 'catalog' && catalog.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>
            {source === 'catalog' ? 'Sonuç yok.' : counts[source] === 0 ? (
              <>Henüz {SOURCE_LABEL[source].toLowerCase()} verisi yok. <Link to="/ut/import" className="text-emerald-700 underline dark:text-emerald-400">Kulüp içe aktar</Link> sayfasından yakalama dosyanı yükle.</>
            ) : 'Bu mevkide kart yok.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
            {rows.map((c) => (
              <li key={c.key}>
                <button type="button" disabled={usedKeys.has(c.key)} className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-700" onClick={() => onPick(c)}>
                  <span>
                    <b>{c.rating}</b> {c.name} <span className="text-xs text-slate-500">{c.club ?? ''}{c.rarity ? ` · ${c.rarity}` : ''}</span>
                    {c.untradeable && <Pill tone="emerald">untradeable</Pill>}
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">{c.price !== undefined ? coins(c.price) : c.league ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {source === 'catalog' && <p className="mt-2 text-xs text-slate-500">Katalog kartları temel EA kartlarıdır; fiyatları yoktur.</p>}
      {library && <p className="mt-2 text-xs text-slate-500">Kulüp/market verisi: {new Date(library.importedAt).toLocaleString('tr-TR')} tarihli yakalama.</p>}
    </Modal>
  )
}
