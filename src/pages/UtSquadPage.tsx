import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { TacticRequest, WeaponState } from '../api/types'
import { FormationStyleChips } from '../components/FormationStyleChips'
import { Modal } from '../components/Modal'
import { Pitch } from '../components/squadBuilder/Pitch'
import type { SlotView } from '../components/squadBuilder/PositionCard'
import { RoleFocusModal } from '../components/squadBuilder/RoleFocusModal'
import { BadgeDot, Button, EmptyState, ErrorBox, Input, Pill, Select, Spinner } from '../components/ui'
import { MAX_SQUAD_CHEM, squadChemistry } from '../lib/chemistry'
import { roleBaseName, roleGroups, swapSlots } from '../lib/squadBuilder'
import { carryOver, fromSummary, priceSummary, type CardSource, type UtCard } from '../lib/utCard'
import { mapActiveSquad } from '../lib/activeSquad'
import { useUtCapture } from '../state/utCaptureStore'
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

type Dialog = { kind: 'card' | 'role'; slotId: string }

const PANEL = 'rounded-2xl border border-line bg-surface p-3.5 text-ink shadow-md'
const PANEL_TITLE = 'mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent'

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
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const capture = useUtCapture()
  const [loadNote, setLoadNote] = useState<string>()

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

  const roleById = new Map((roles.data ?? []).map((r) => [r.id, r]))
  const views: SlotView[] = slots.map((s, i) => {
    const card = picked[s.slotId]
    const e = evalBySlot[s.slotId]
    const role = roleById.get(roleBySlot[s.slotId]?.roleId ?? s.defaultRole)
    const band = e?.roleFit !== undefined ? (e.badge ?? CHEM_BADGE[chem.perSlot[i]]) : undefined
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      player: card && { id: i, name: card.name, overall: card.rating },
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : (roleBySlot[s.slotId]?.roleName ?? '…'),
      sub: card ? `${e ? `meta ${Math.round(e.card.metaRating)}` : ''} ${'◆'.repeat(chem.perSlot[i])}${'◇'.repeat(3 - chem.perSlot[i])} ${shortCoins(card.price)}`.trim() : undefined,
      fit: card && e?.roleFit !== undefined && band ? { pct: Math.round(e.roleFit), band } : undefined,
    }
  })

  const dialogSlot = slots.find((s) => s.slotId === dialog?.slotId)

  function changeFormation(id: string) {
    const next = formations.data?.find((f) => f.id === id)
    setPicked((cur) => carryOver(slots, cur, next?.slots ?? []))
    setFormationId(id)
    setRoleOverride({})
    setDialog(null)
  }

  function loadActiveSquad() {
    const squad = capture?.activeSquad
    if (!squad || !formations.data) {
      return
    }
    const loaded = mapActiveSquad(squad, formations.data, formation)
    if (loaded.formationId) {
      setFormationId(loaded.formationId)
    }
    setRoleOverride({})
    setPicked(loaded.picked)
    setDialog(null)
    setLoadNote(`${Object.keys(loaded.picked).length} kart aktif kadrodan yüklendi${loaded.unplaced > 0 ? `, ${loaded.unplaced} kart yerleşemedi` : ''}. Taktik (rol/focus) yakalanmadığı için roller otomatik.`)
  }

  function removeCard(slotId: string) {
    setPicked((cur) => {
      const { [slotId]: _removed, ...rest } = cur
      return rest
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
          <UtTacticCode
            tactic={tactic}
            onLoaded={(r) => {
              setFormationId(r.formation)
              setPicked({})
              setRoleOverride(Object.fromEntries(r.slots.map((s) => [s.slotId, s.roleId])))
              setSetup({ buildUp: (BUILD_UPS as readonly string[]).includes(r.buildUp) ? (r.buildUp as Setup['buildUp']) : 'Balanced', depth: r.depth })
            }}
          />

          <section className={PANEL}>
            <h2 className={PANEL_TITLE}>Kadro Özeti</h2>
            {formations.isLoading ? (
              <Spinner />
            ) : formations.error ? (
              <ErrorBox error={formations.error} />
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <label htmlFor="ut-formation">Formasyon ({formations.data?.length ?? 0})</label>
                  <Select id="ut-formation" value={formation?.id} onChange={(e) => changeFormation(e.target.value)} className="!w-auto !bg-surface-2 !text-ink">
                    {(formations.data ?? []).map((f) => (
                      <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
                    ))}
                  </Select>
                </div>
                <FormationStyleChips formationId={formation?.id} />
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span>Build-Up</span>
                  <div role="radiogroup" aria-label="Build-Up" className="flex gap-1.5">
                    {BUILD_UPS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={setup.buildUp === b}
                        onClick={() => setSetup((cur) => ({ ...cur, buildUp: b }))}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] ${setup.buildUp === b ? 'border-accent text-accent' : 'border-line text-muted'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-[13px]">
                  <span className="mb-1 block">Savunma hattı: {setup.depth}</span>
                  <input type="range" min={0} max={100} value={setup.depth} onChange={(e) => setSetup((cur) => ({ ...cur, depth: Number(e.target.value) }))} className="w-full accent-emerald-400" />
                </label>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5 text-sm">
                  <Pill tone={chem.total >= 30 ? 'emerald' : chem.total >= 20 ? 'amber' : 'rose'}>kimya {chem.total} / {MAX_SQUAD_CHEM}</Pill>
                  <Pill tone="sky">meta* ort. {evaluation.data ? evaluation.data.averageMeta : '—'}</Pill>
                  <Pill tone="slate">OVR ort. {evaluation.data ? evaluation.data.averageOverall : '—'}</Pill>
                  <Pill tone="slate">{pickedSlots.length}/11 dolu</Pill>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <Pill tone="amber">ort. ücret {coins(price.average)}</Pill>
                  <Pill tone="amber">toplam {coins(price.known > 0 ? price.total : undefined)}</Pill>
                </div>
                <p className="text-xs text-muted">{price.known}/{price.count} kartın fiyatı biliniyor</p>
                <Summary evaluation={evaluation.data?.slots ?? []} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setPicked({})}>Kartları temizle</Button>
                  {capture?.activeSquad && (
                    <Button variant="secondary" onClick={loadActiveSquad}>Kulüp aktif kadrosunu yükle</Button>
                  )}
                </div>
                {loadNote && <p role="status" className="text-xs text-accent">{loadNote}</p>}
                {!capture?.activeSquad && <p className="text-xs text-muted">Aktif kadroyu yüklemek için Web App'te Kadro ekranını açıp yeniden yakalama dosyası içe aktar.</p>}
                <p className="text-xs text-muted">
                  Meta* platformun tahmin metriğidir; kendi kartlarında gerçek attribute'ları kullanılır. Fiyat: kulüp kartlarında pazar ortalaması (yoksa son satış), market ilanlarında satın alma fiyatı; katalog kartlarının fiyatı yoktur ve ortalamaya girmez.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="order-1 rounded-2xl border border-line bg-surface p-2.5 min-[820px]:order-2">
          <Pitch
            slots={views}
            onPickPlayer={(slotId) => setDialog({ kind: 'card', slotId })}
            onPickRole={(slotId) => setDialog({ kind: 'role', slotId })}
            onRemove={removeCard}
            onSwap={(from, to) => setPicked((cur) => swapSlots(cur, from, to))}
          />
          <p className="mt-2 px-1 text-xs text-muted">Kartı başka bir slota sürükle: yer değiştirirler. Karta tıkla: kart ata ve ayrıntı. Rol etiketine tıkla: rol ve focus. ✕: kartı kaldır. Kart üstünde: meta · kimya · fiyat. Formasyon değişince kartlar aynı mevkideki slotlara taşınır.</p>
        </div>
      </div>

      {dialog?.kind === 'card' && dialogSlot && (
        <PickModal
          position={dialogSlot.position}
          slotId={dialogSlot.slotId}
          current={picked[dialogSlot.slotId]}
          roleName={roleBySlot[dialogSlot.slotId]?.roleName}
          evaluation={evalBySlot[dialogSlot.slotId]}
          chemLinks={chem.perSlot[slots.indexOf(dialogSlot)]}
          usedKeys={new Set(Object.values(picked).map((c) => c.key))}
          onClose={() => setDialog(null)}
          onPick={(card) => {
            setPicked((cur) => ({ ...cur, [dialogSlot.slotId]: card }))
            setDialog(null)
          }}
        />
      )}
      {dialog?.kind === 'role' && dialogSlot && (
        <RoleFocusModal
          position={dialogSlot.position}
          groups={roleGroups(roles.data ?? [], dialogSlot.position)}
          currentRoleId={roleBySlot[dialogSlot.slotId]?.roleId ?? dialogSlot.defaultRole}
          onApply={(rid) => {
            setRoleOverride((cur) => ({ ...cur, [dialogSlot.slotId]: rid }))
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
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
    <ul className="space-y-0.5 text-sm">
      <li className="text-accent">+ Rolüne tam oturan: {strong.length}</li>
      {weak.length > 0 && <li className="rounded-lg border border-danger-line bg-danger-soft px-2.5 py-1.5 text-xs text-danger">Rolüne uymayan: {weak.map((w) => `${w.slotId} (${w.roleName})`).join(', ')}</li>}
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
  const [open, setOpen] = useState(false)
  const [importError, setImportError] = useState<unknown>()
  const code = exportCode.data?.code
  async function copy() {
    if (!code) {
      return
    }
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
    <section className={PANEL}>
      <h2 className={PANEL_TITLE}>EA Taktik Kodu</h2>
      <div aria-live="polite" className="rounded-[10px] border border-line bg-surface-2 p-3 text-center font-mono text-xl font-extrabold tracking-[3px] text-code">
        {code ?? (exportCode.isFetching ? '…' : '—')}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" disabled={!code} onClick={copy} className="flex-1 rounded-lg bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent disabled:opacity-50">
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
        <button type="button" disabled={!code} onClick={() => setOpen(true)} className="flex-1 rounded-lg bg-surface-2 py-2 text-[12.5px] font-bold text-ink disabled:opacity-50">
          Oyuna Aktar
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted">Kod formasyon, rol, Build-Up ve hat değiştikçe otomatik güncellenir.</p>
      {exportCode.data?.warnings.map((w) => <p key={w} className="text-xs text-code">{w}</p>)}
      <ErrorBox error={exportCode.error} />
      <div className="mt-2.5 flex items-center gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır" className="font-mono" maxLength={16} aria-label="EA kodunu yapıştır" />
        <Button disabled={!input.trim()} onClick={load}>Yükle</Button>
      </div>
      <ErrorBox error={importError} />
      <p className="mt-1.5 text-xs text-muted">Kod mod-bağımsızdır: kariyerdeki taktik kodunun aynısı. Yüklemek formasyonu, rolleri, Build-Up'ı ve hattı değiştirir, kartları temizler.</p>
      {open && code && (
        <Modal title="Oyuna aktar" hint="Kodu oyunda içe aktar" onClose={() => setOpen(false)}>
          <div className="rounded-[10px] border border-line bg-surface-2 p-3 text-center font-mono text-2xl font-extrabold tracking-[3px] text-code">{code}</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-ink">
            <li>Kodu kopyala.</li>
            <li>Oyunda Takım Yönetimi → Taktikler → Kod Kullan bölümüne gir.</li>
            <li>Kodu yapıştır; büyük/küçük harf önemlidir.</li>
          </ol>
          <button type="button" onClick={copy} className="mt-4 w-full rounded-lg bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent">Kopyala</button>
        </Modal>
      )}
    </section>
  )
}

interface PickProps {
  position: string
  slotId: string
  current?: UtCard
  roleName?: string
  evaluation?: {
    card: { metaRating: number; tier: string; bestChemStyle?: string; chemStyles?: { style: string; metaRating: number; delta: number }[] }
    roleFit?: number
    badge?: WeaponState
    roleName?: string
    setupDelta?: number
    reason?: string
  }
  chemLinks?: number
  usedKeys: Set<string>
  onClose: () => void
  onPick: (c: UtCard) => void
}

function CurrentCard({ card, evaluation, chemLinks }: { card: UtCard; evaluation: PickProps['evaluation']; chemLinks?: number }) {
  const links = chemLinks ?? 0
  return (
    <div className="mb-3 space-y-1.5 rounded-xl border border-line bg-surface-2 p-3 text-sm">
      <p className="font-semibold">{card.name}</p>
      <p className="text-xs text-muted">
        {SOURCE_LABEL[card.source]} · {card.rating} OVR{card.rarity ? ` · ${card.rarity}` : ''}{card.club ? ` · ${card.club}` : ''} · fiyat {coins(card.price)}
        {card.untradeable ? ' · untradeable' : ''}
      </p>
      {evaluation ? (
        <>
          <p>
            Meta rating* <b className="text-lg tabular-nums">{evaluation.card.metaRating}</b> <Pill tone={TIER_TONE[evaluation.card.tier] ?? 'slate'}>{evaluation.card.tier}</Pill>
            {' · '}Kimya <b>{'◆'.repeat(links)}{'◇'.repeat(3 - links)}</b>
          </p>
          {evaluation.roleFit !== undefined && (
            <p className="flex items-center gap-1.5">
              {evaluation.badge && <BadgeDot state={evaluation.badge} />} RoleFit <b>%{Math.round(evaluation.roleFit)}</b> · {evaluation.roleName}
              {evaluation.setupDelta !== undefined && evaluation.setupDelta !== 0 && <span className="text-xs text-muted">(ayar {evaluation.setupDelta > 0 ? '+' : ''}{evaluation.setupDelta})</span>}
            </p>
          )}
          {evaluation.reason && <p className="text-xs text-muted">{evaluation.reason}</p>}
          {evaluation.card.chemStyles && (
            <p className="text-xs">
              Chem style önerisi: <b>{evaluation.card.bestChemStyle}</b>{' '}
              {evaluation.card.chemStyles.filter((c) => c.style === evaluation.card.bestChemStyle).map((c) => `(meta ${c.metaRating}, +${c.delta})`)}
            </p>
          )}
          {!card.club && card.source !== 'catalog' && (
            <p className="text-xs text-code">Bu kartın kulüp/lig/ülke adı çözülemedi; kimya bağları hesaba katılmıyor olabilir.</p>
          )}
        </>
      ) : (
        <Spinner />
      )}
    </div>
  )
}

function PickModal({ position, slotId, current, evaluation, chemLinks, usedKeys, onClose, onPick }: PickProps) {
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
    <Modal wide title={`${slotId} · ${position} — Kart seç`} hint="Kulüp kartların, market ilanları veya katalog" onClose={onClose}>
      {current && <CurrentCard card={current} evaluation={evaluation} chemLinks={chemLinks} />}
      <div role="tablist" aria-label="Kart kaynağı" className="mb-3 flex gap-1">
        {(['club', 'market', 'catalog'] as CardSource[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={source === s}
            onClick={() => setSource(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${source === s ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-ink/80 hover:bg-surface-2'}`}
          >
            {SOURCE_LABEL[s]}{s !== 'catalog' ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>
      <Input placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Kart ara" />
      <div className="mt-3 max-h-80 overflow-y-auto">
        {source === 'catalog' && catalog.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>
            {source === 'catalog' ? 'Sonuç yok.' : counts[source] === 0 ? (
              <>Henüz {SOURCE_LABEL[source].toLowerCase()} verisi yok. <Link to="/ut/import" className="text-accent underline">Kulüp içe aktar</Link> sayfasından yakalama dosyanı yükle.</>
            ) : 'Bu mevkide kart yok.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((c) => (
              <li key={c.key}>
                <button type="button" disabled={usedKeys.has(c.key) && c.key !== current?.key} className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left hover:bg-surface-2 disabled:opacity-40" onClick={() => onPick(c)}>
                  <span>
                    <b>{c.rating}</b> {c.name} <span className="text-xs text-muted">{c.club ?? ''}{c.rarity ? ` · ${c.rarity}` : ''}</span>
                    {c.untradeable && <Pill tone="emerald">untradeable</Pill>}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{c.price !== undefined ? coins(c.price) : c.league ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {source === 'catalog' && <p className="mt-2 text-xs text-muted">Katalog kartları temel EA kartlarıdır; fiyatları yoktur.</p>}
      {library && <p className="mt-2 text-xs text-muted">Kulüp/market verisi: {new Date(library.importedAt).toLocaleString('tr-TR')} tarihli yakalama.</p>}
    </Modal>
  )
}
