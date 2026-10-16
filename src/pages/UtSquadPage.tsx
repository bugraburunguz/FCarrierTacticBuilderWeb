import { Link } from 'react-router-dom'
import type { WeaponState } from '../api/types'
import { FormationStyleChips } from '../components/FormationStyleChips'
import { Pitch } from '../components/pitch/Pitch'
import { Button, ErrorBox, Pill, Select, Spinner } from '../components/ui'
import { coins, shortCoins } from '../lib/coins'
import { PickModal } from '../features/squad/ut/PickBody'
import { SquadRoleDialog } from '../features/squad/SquadWorkspaceView'
import { TacticCodeCard } from '../features/squad/TacticCodeCard'
import { useUtSquadBuilder } from '../features/squad/useUtSquadBuilder'
import { MAX_SQUAD_CHEM } from '../lib/chemistry'

const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const

const PANEL = 'rounded-md border border-line bg-surface p-3.5 text-ink'
const PANEL_TITLE = 'mb-2.5 border-b border-line pb-1.5 font-display text-lg font-bold uppercase tracking-wide'

/** v2 UT kadro kurucusu (v3: features/squad/UtSquadBuilderPage). Ortak mantık useUtSquadBuilder'da. */
export function UtSquadPage() {
  const { ws, setup, setSetup, capture, captureOn, pickedSlots, evaluation, chem, price, rating, views, loadActiveSquad, pickDialog, pickProps } = useUtSquadBuilder()
  const { formation, formations } = ws
  const loadNote = ws.note
  const tacticCode = <TacticCodeCard mode="ut" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />

  return (
    <div className="matchday space-y-3">
      <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-line bg-line">
        <Kpi label="Rating" value={rating !== undefined ? String(rating) : '—'} />
        <Kpi label="Kimya" value={`${chem.total}`} suffix={`/ ${MAX_SQUAD_CHEM}`} />
        <Kpi label="Meta ort." value={evaluation.data ? String(evaluation.data.averageMeta) : '—'} />
        {captureOn && <Kpi label="Toplam değer" value={shortCoins(price.known > 0 ? price.total : undefined)} suffix={price.count > price.known ? `${price.known}/${price.count} fiyat` : undefined} />}
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
                {captureOn && (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <Pill tone="amber">ort. ücret {coins(price.average)}</Pill>
                      <Pill tone="amber">toplam {coins(price.known > 0 ? price.total : undefined)}</Pill>
                    </div>
                    <p className="text-xs text-muted">{price.known}/{price.count} kartın fiyatı biliniyor</p>
                  </>
                )}
                <Summary evaluation={evaluation.data?.slots ?? []} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={ws.clearAssigned}>Kartları temizle</Button>
                  {captureOn && capture?.activeSquad && (
                    <Button variant="secondary" onClick={loadActiveSquad}>Kulüp aktif kadrosunu yükle</Button>
                  )}
                </div>
                {loadNote && <p role="status" className="text-xs text-accent">{loadNote}</p>}
                {captureOn && !capture?.activeSquad && <p className="text-xs text-muted">Aktif kadroyu yüklemek için Web App'te Kadro ekranını açıp yeniden yakalama dosyası içe aktar.</p>}
                <p className="text-xs text-muted">
                  Meta* platformun tahmin metriğidir; kendi kartlarında gerçek attribute'ları kullanılır.
                  {captureOn && ' Fiyat: kulüp kartlarında pazar ortalaması (yoksa son satış), market ilanlarında satın alma fiyatı; katalog kartlarının fiyatı yoktur ve ortalamaya girmez.'}
                </p>
              </div>
            )}
          </section>

          {captureOn && (capture?.sbcSets ?? []).length > 0 && (
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
