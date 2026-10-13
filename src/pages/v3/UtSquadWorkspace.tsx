import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Workspace } from '../../design/components/Workspace'
import { Button, ChemBar, Chip, EmptyState, Panel, Segmented, SidePanel, Skeleton, StatTile } from '../../design/components/primitives'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import type { UtCard } from '../../lib/utCard'

export interface UtSquadViewModel {
  views: PitchSlot[]
  selectedSlotId?: string
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove: (slotId: string) => void
  onSwap: (from: string, to: string) => void
  /** Slot seçiliyken yan panelin gövdesi (kart seçimi, 08 §15). */
  pick?: { title: string; onClose: () => void; body: ReactNode }
  formations: { id: string; label: string }[]
  formationsLoading: boolean
  formationsError?: string
  formationId?: string
  onFormation: (id: string) => void
  buildUp: 'Short' | 'Balanced' | 'Counter'
  onBuildUp: (b: 'Short' | 'Balanced' | 'Counter') => void
  depth: number
  onDepth: (n: number) => void
  rating?: number
  chem: number
  maxChem: number
  filled: number
  averages: { label: string; value?: number }[]
  priceTotal?: string
  priceAverage?: string
  priceKnown: string
  metaAverage?: number
  cards: UtCard[]
  loadNote?: string
  tacticCode: ReactNode
  onClear: () => void
  onLoadActive?: () => void
  rolesNote?: ReactNode
}

/** Slot seçili değilken yan panel varsayılan hâli (08 §16.1): kadro bilgisi, toplam kimya, fiyat. Boş değerler "–". */
function SquadInfo({ vm }: { vm: UtSquadViewModel }) {
  return (
    <div className="space-y-4">
      <section aria-label="Kadro bilgisi" className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <label htmlFor="v3-formation" className="text-ink-2">Formasyon</label>
          {vm.formationsLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : vm.formationsError ? (
            <span role="alert" className="text-bad">{vm.formationsError}</span>
          ) : (
            <select id="v3-formation" value={vm.formationId} onChange={(e) => vm.onFormation(e.target.value)} className="glass-3 min-h-10 max-w-[220px] px-3 text-sm text-ink max-sm:min-h-11">
              {vm.formations.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-ink-2">Build-Up</span>
          <Segmented label="Build-Up" value={vm.buildUp} options={[{ id: 'Short', label: 'Short' }, { id: 'Balanced', label: 'Balanced' }, { id: 'Counter', label: 'Counter' }]} onChange={vm.onBuildUp} />
        </div>
        <label className="block text-sm text-ink-2">
          Savunma hattı: <span className="font-[var(--font-num)] tabular-nums text-ink">{vm.depth}</span>
          <input type="range" min={0} max={100} value={vm.depth} onChange={(e) => vm.onDepth(Number(e.target.value))} className="mt-1 block w-full accent-[var(--accent)]" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Rating" value={vm.rating} />
          <StatTile label="Dolu" value={vm.filled} suffix="/ 11" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {vm.averages.map((a) => (
            <StatTile key={a.label} label={a.label} value={a.value} />
          ))}
        </div>
      </section>

      <section aria-label="Toplam kimya" className="space-y-2">
        <h3 className="font-display text-lg font-semibold">Toplam kimya</h3>
        <ChemBar value={vm.chem} max={vm.maxChem} />
        <Chip tone="info">Meta ort. {vm.metaAverage ?? '–'}</Chip>
      </section>

      <section aria-label="Fiyat" className="space-y-2">
        <h3 className="font-display text-lg font-semibold">Fiyat</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Toplam" value={vm.priceTotal} />
          <StatTile label="Ortalama" value={vm.priceAverage} />
        </div>
        <p className="text-xs text-muted">{vm.priceKnown}</p>
      </section>

      <section aria-label="EA taktik kodu">{vm.tacticCode}</section>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={vm.onClear} disabled={vm.filled === 0} disabledReason="Kadro zaten boş">Kartları temizle</Button>
        {vm.onLoadActive && <Button onClick={vm.onLoadActive}>Kulüp aktif kadrosunu yükle</Button>}
      </div>
      {vm.loadNote && <p role="status" className="text-xs text-accent">{vm.loadNote}</p>}
      {vm.rolesNote}
    </div>
  )
}

/** v3 UT Kadro Kurucu (V3-04): Çalışma alanı şablonu — sahada tıklanan mevki yan paneli kart seçimine çevirir (08 §14-16). */
export function UtSquadWorkspace({ vm }: { vm: UtSquadViewModel }) {
  return (
    <Workspace
      title="UT Kadro Kurucu"
      hero={
        <>
          <Pitch
            slots={vm.views.map((v) => ({ ...v, selected: v.slotId === vm.selectedSlotId }))}
            onPickPlayer={vm.onPickPlayer}
            onPickRole={vm.onPickRole}
            onRemove={vm.onRemove}
            onSwap={vm.onSwap}
          />
          <p className="mt-2 px-1 text-xs text-muted">
            Sürükle ya da <kbd className="rounded-sm border border-line px-1">M</kbd> ile taşı · Enter seç · Rol çipine tıkla: rol ve odak.
          </p>
        </>
      }
      side={
        vm.pick ? (
          <SidePanel sheet title={vm.pick.title} onClose={vm.pick.onClose}>
            {vm.pick.body}
          </SidePanel>
        ) : (
          <SidePanel title="Kadro bilgisi">
            <SquadInfo vm={vm} />
          </SidePanel>
        )
      }
      header={
        vm.cards.length === 0 && vm.filled === 0 ? (
          <Panel>
            <EmptyState action={<Link to="/ut/import" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-on-accent">Kulüp içe aktar</Link>}>
              Kulüp kartların yok: sahada bir mevkiye tıkla, katalogdan kart seç ya da yakalama dosyanı yükle.
            </EmptyState>
          </Panel>
        ) : undefined
      }
    />
  )
}
