import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { WeaponState } from '../api/types'
import { FormationStyleChips } from '../components/FormationStyleChips'
import { Pitch, type PitchSlot } from '../components/pitch/Pitch'
import { cardPlayerOf } from '../lib/cardPlayer'
import type { FitState } from '../components/card/FitBadge'
import { Button, ErrorBox, Pill, Select, Spinner } from '../components/ui'
import { coins, shortCoins } from '../lib/coins'
import { PickBody, PickModal } from '../features/squad/ut/PickBody'
import { Chip, StatTile } from '../design/components/primitives'
import { SquadRoleDialog, SquadWorkspaceView } from '../features/squad/SquadWorkspaceView'
import { TacticCodeCard } from '../features/squad/TacticCodeCard'
import type { TacticSetup } from '../features/squad/types'
import { useSquadWorkspace } from '../features/squad/useSquadWorkspace'
import { useUtBinding } from '../features/squad/useUtBinding'
import { useUtRules } from '../state/rulesStore'
import { isV3 } from '../design/uiVersion'
import { MAX_SQUAD_CHEM, squadChemistry } from '../lib/chemistry'
import { teamRating } from '../lib/sbcTraditional'
import { roleBaseName } from '../lib/squadBuilder'
import { personKey, priceSummary, type UtCard } from '../lib/utCard'
import { mapActiveSquad } from '../lib/activeSquad'
import { useUtCapture } from '../state/utCaptureStore'
import { utCardStore } from '../state/utCardStore'
import { DEFAULT_UT_SETUP } from '../state/utSquadStore'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']
const FIT_STATE: Record<WeaponState, FitState> = { GREEN: 'good', YELLOW: 'ok', RED: 'bad' }
const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const

const PANEL = 'rounded-md border border-line bg-surface p-3.5 text-ink'
const PANEL_TITLE = 'mb-2.5 border-b border-line pb-1.5 font-display text-lg font-bold uppercase tracking-wide'

export function UtSquadPage() {
  useUtRules()
  const { binding, saved, markActiveSquad } = useUtBinding()
  const ws = useSquadWorkspace('ut', binding)
  const { state, slots, roleBySlot, formation, formations, selection, selectedSlot: dialogSlot } = ws
  const picked = state.assigned
  const setup = state.setup ?? DEFAULT_UT_SETUP
  const setSetup = (change: Partial<TacticSetup>) => ws.patch((cur) => ({ setup: { ...(cur.setup ?? DEFAULT_UT_SETUP), ...change } }))
  const capture = useUtCapture()
  const loadNote = ws.note

  const pickedSlots = slots.filter((s) => picked[s.slotId] && roleBySlot.get(s.slotId))
  const evaluationBody = pickedSlots.map((s) => {
    const card = picked[s.slotId]
    return {
      slotId: s.slotId,
      position: s.position,
      roleId: roleBySlot.get(s.slotId)!.roleId,
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

  const chemOf = (cardAt: (slotId: string) => UtCard | undefined) =>
    squadChemistry(
      slots.map((s, i) => {
        const p = cardAt(s.slotId)
        return {
          position: s.position,
          card: p ? { id: i, gender: p.gender, club: p.club, league: p.league, nationality: p.nationality, clubId: p.clubId, leagueId: p.leagueId, nationId: p.nationId, positions: p.positions, cardType: p.cardType } : undefined,
        }
      }),
    )
  const chem = useMemo(() => chemOf((slotId) => picked[slotId]), [slots, picked]) // eslint-disable-line react-hooks/exhaustive-deps
  const price = priceSummary(slots.map((s) => picked[s.slotId]))

  const roleById = new Map((ws.roles.data ?? []).map((r) => [r.id, r]))
  const views: PitchSlot[] = slots.map((s, i) => {
    const card = picked[s.slotId]
    const e = evalBySlot[s.slotId]
    const role = roleById.get(roleBySlot.get(s.slotId)?.roleId ?? s.defaultRole)
    const band = e?.roleFit !== undefined ? (e.badge ?? CHEM_BADGE[chem.perSlot[i]]) : undefined
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      player: card && cardPlayerOf(card, s.position),
      chem: card ? (chem.perSlot[i] as 0 | 1 | 2 | 3) : undefined,
      price: card?.price !== undefined ? shortCoins(card.price) : undefined,
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : roleBySlot.get(s.slotId)?.roleName,
      fit: card && e?.roleFit !== undefined && band ? { pct: Math.round(e.roleFit), state: FIT_STATE[band] } : undefined,
    }
  })

  // Kadro her değişimde utSquadStore'a kaydedilir (useUtBinding); kayıtlı kadro yokken yakalamada aktif kadro varsa otomatik yerleşir.
  const autoApplied = useRef(false)
  useEffect(() => {
    if (autoApplied.current || saved || !capture?.activeSquad || !formations.data) {
      return
    }
    autoApplied.current = true
    const loaded = mapActiveSquad(capture.activeSquad, formations.data)
    if (loaded.formationId) {
      markActiveSquad()
      ws.patch({ formationId: loaded.formationId, assigned: loaded.picked })
      ws.setNote(`Kulübünün aktif kadrosu otomatik yüklendi (${Object.keys(loaded.picked).length} kart${capture.activeSquad.tactic?.tacticName ? ` · taktik: ${capture.activeSquad.tactic.tacticName}` : ''}).`)
    }
  }, [saved, capture, formations.data, markActiveSquad, ws])

  function loadActiveSquad() {
    const squad = capture?.activeSquad
    if (!squad || !formations.data) {
      return
    }
    const loaded = mapActiveSquad(squad, formations.data, formation)
    ws.patch({ ...(loaded.formationId ? { formationId: loaded.formationId } : {}), roleOverride: {}, assigned: loaded.picked })
    markActiveSquad()
    ws.clearSelection()
    ws.setNote(`${Object.keys(loaded.picked).length} kart aktif kadrodan yüklendi${loaded.unplaced > 0 ? `, ${loaded.unplaced} kart yerleşemedi` : ''}${squad.tactic?.tacticName ? ` · taktik: ${squad.tactic.tacticName}` : ''}. Taktik talimatları (rol/focus) henüz çözülmediği için roller otomatik.`)
  }

  const tacticCode = <TacticCodeCard mode="ut" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />
  const pickDialog = selection?.panel === 'card' && dialogSlot ? dialogSlot : undefined
  const pickProps = pickDialog && {
    position: pickDialog.position,
    current: picked[pickDialog.slotId],
    roleName: roleBySlot.get(pickDialog.slotId)?.roleName,
    roleId: roleBySlot.get(pickDialog.slotId)?.roleId,
    setup,
    chemFor: (card: UtCard) => chemOf((slotId) => (slotId === pickDialog.slotId ? card : picked[slotId])).perSlot[slots.indexOf(pickDialog)] as 0 | 1 | 2 | 3,
    onClear: () => {
      ws.assign(pickDialog.slotId, null)
      ws.clearSelection()
    },
    evaluation: evalBySlot[pickDialog.slotId],
    chemLinks: chem.perSlot[slots.indexOf(pickDialog)],
    usedKeys: new Set(Object.values(picked).map(personKey)),
    onPick: (card: UtCard) => {
      ws.assign(pickDialog.slotId, card)
      ws.clearSelection()
    },
  }

  if (isV3()) {
    return (
      <>
        <SquadWorkspaceView
          title="UT Kadro Kurucu"
          slots={views}
          selectedSlotId={pickDialog?.slotId}
          onPickPlayer={(slotId) => ws.select(slotId, 'card')}
          onPickRole={(slotId) => ws.select(slotId, 'role')}
          onRemove={(slotId) => ws.assign(slotId, null)}
          onSwap={ws.swap}
          slotPanel={pickProps && pickDialog ? { title: `${pickDialog.position} — Kart seç`, onClose: ws.clearSelection, body: <PickBody {...pickProps} /> } : undefined}
          formations={(formations.data ?? []).map((f) => ({ id: f.id, label: f.label ?? f.id }))}
          formationsLoading={formations.isLoading}
          formationsError={formations.error ? 'Formasyonlar yüklenemedi.' : undefined}
          formationId={formation?.id}
          onFormation={(id) => ws.changeFormation(id)}
          setup={setup}
          onSetup={(next) => setSetup(next)}
          stats={[{ label: 'Rating', value: pickedSlots.length === 11 ? teamRating(Object.values(picked).map((card) => card.rating)) : undefined }, { label: 'Dolu', value: pickedSlots.length, suffix: '/ 11' }]}
          averages={ws.averages}
          chem={{ value: chem.total, max: MAX_SQUAD_CHEM }}
          sections={
            <>
              <section aria-label="Meta" className="space-y-2">
                <Chip tone="info">Meta ort. {evaluation.data?.averageMeta ?? '–'}</Chip>
              </section>
              <section aria-label="Fiyat" className="space-y-2">
                <h3 className="font-display text-lg font-semibold">Fiyat</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Toplam" value={price.known > 0 ? shortCoins(price.total) : undefined} />
                  <StatTile label="Ortalama" value={price.average !== undefined ? shortCoins(price.average) : undefined} />
                </div>
                <p className="text-xs text-muted">{price.known}/{price.count} kartın fiyatı biliniyor</p>
              </section>
            </>
          }
          tacticCode={tacticCode}
          onClear={ws.clearAssigned}
          clearDisabled={pickedSlots.length === 0}
          note={loadNote}
          actions={capture?.activeSquad ? <Button onClick={loadActiveSquad}>Kulüp aktif kadrosunu yükle</Button> : undefined}
          notice={(utCardStore.get()?.cards ?? []).length === 0 && pickedSlots.length === 0 ? { id: 'ut-no-cards', text: <>Kulüp kartların yok: mevkiye tıkla, katalogdan seç ya da <Link to="/ut/import" className="text-accent underline">kulüp içe aktar</Link>.</> } : undefined}
        />
        <SquadRoleDialog ws={ws} />
      </>
    )
  }

  return (
    <div className="matchday space-y-3">
      <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-line bg-line">
        <Kpi label="Rating" value={pickedSlots.length === 11 ? String(teamRating(Object.values(picked).map((c) => c.rating))) : '—'} />
        <Kpi label="Kimya" value={`${chem.total}`} suffix={`/ ${MAX_SQUAD_CHEM}`} />
        <Kpi label="Meta ort." value={evaluation.data ? String(evaluation.data.averageMeta) : '—'} />
        <Kpi label="Toplam değer" value={shortCoins(price.known > 0 ? price.total : undefined)} suffix={price.count > price.known ? `${price.known}/${price.count} fiyat` : undefined} />
        <Kpi label="Dolu" value={`${pickedSlots.length}`} suffix="/ 11" />
      </div>
      <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
          {tacticCode}

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
                  <Select id="ut-formation" value={formation?.id} onChange={(e) => ws.changeFormation(e.target.value)} className="!w-auto !bg-surface-2 !text-ink">
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
                        onClick={() => setSetup({ buildUp: b })}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] ${setup.buildUp === b ? 'border-accent text-accent' : 'border-line text-muted'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-[13px]">
                  <span className="mb-1 block">Savunma hattı: {setup.depth}</span>
                  <input type="range" min={0} max={100} value={setup.depth} onChange={(e) => setSetup({ depth: Number(e.target.value) })} className="w-full accent-accent" />
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
                  <Button variant="ghost" onClick={ws.clearAssigned}>Kartları temizle</Button>
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

          {(capture?.sbcSets ?? []).length > 0 && (
            <section className={PANEL}>
              <h2 className={PANEL_TITLE}>Kulüp SBC'leri</h2>
              <ul className="space-y-1 text-[13px]">
                {(capture?.sbcSets ?? [])
                  .filter((set) => set.challengesCompleted < set.challengesCount || set.repeatable)
                  .slice(0, 8)
                  .map((set) => (
                    <li key={set.setId} className="flex items-center justify-between gap-2 border-t border-line pt-1 first:border-0 first:pt-0">
                      <span className="truncate">{set.name ?? `#${set.setId}`}</span>
                      <span className="shrink-0 tabular-nums text-xs text-muted">{set.challengesCompleted}/{set.challengesCount}</span>
                    </li>
                  ))}
              </ul>
              <Link to="/ut/sbc" className="mt-2 inline-block text-xs text-accent underline">En ucuz çözümü gör (SBC çözücü)</Link>
            </section>
          )}
        </div>

        <div className="order-1 rounded-md border border-line bg-surface p-2.5 min-[820px]:order-2">
          <Pitch
            slots={views}
            onPickPlayer={(slotId) => ws.select(slotId, 'card')}
            onPickRole={(slotId) => ws.select(slotId, 'role')}
            onRemove={(slotId) => ws.assign(slotId, null)}
            onSwap={ws.swap}
          />
          <p className="mt-2 px-1 text-xs text-muted">Sürükle ya da <kbd className="rounded-sm border border-line px-1">M</kbd> ile taşı · Enter seç · kartın üstüne gelince aynı kulüp/lig/ülkedekiler vurgulanır.</p>
        </div>
      </div>

      {pickDialog && pickProps && <PickModal slotId={pickDialog.slotId} onClose={ws.clearSelection} {...pickProps} />}
      <SquadRoleDialog ws={ws} />
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
      {weak.length > 0 && <li className="rounded-md border border-danger-line bg-danger-soft px-2.5 py-1.5 text-xs text-danger">Rolüne uymayan: {weak.map((w) => `${w.slotId} (${w.roleName})`).join(', ')}</li>}
    </ul>
  )
}


function Kpi({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex min-w-[96px] flex-1 flex-col bg-surface px-3 py-2">
      <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="num text-2xl font-medium leading-tight">{value}</span>
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
    </div>
  )
}
