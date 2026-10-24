import { Star, StarHalf } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { HelpPopover } from '../../components/ui'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import { RoleFocusModal } from '../../components/squadBuilder/RoleFocusModal'
import { MobileSheet, useIsMobile } from '../../design/components/MobileSheet'
import { Workspace } from '../../design/components/Workspace'
import { Button, ChemBar, Segmented, SidePanel, Skeleton, StatTile } from '../../design/components/primitives'
import type { FaceAverage } from '../../lib/faceAverages'
import { roleGroups } from '../../lib/squadBuilder'
import type { TacticSetup } from './types'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const

export interface SquadViewProps {
  title: string
  slots: PitchSlot[]
  /** KARIYER-UX FAZ 4a (Lab): Cyber-Pitch zemini ve kart/piyon işareti. Verilmezse Pitch varsayılanı (UT değişmez). */
  field?: 'grass' | 'cyber'
  marker?: 'card' | 'pawn'
  selectedSlotId?: string
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove: (slotId: string) => void
  onSwap?: (from: string, to: string) => void
  pitchHint?: ReactNode
  /** Kariyer: sahadaki kartlar EA kart görseli (UT'de verilmez). */
  eaCards?: boolean
  /** Slot seçiliyken yan panelin gövdesi (UT: kart seçimi, kariyer: oyuncu/davranış/öneri sekmeleri; 08 §15). */
  slotPanel?: { title: string; onClose: () => void; body: ReactNode }
  formations: { id: string; label: string }[]
  formationsLoading: boolean
  formationsError?: string
  formationId?: string
  onFormation: (id: string) => void
  setup: TacticSetup
  onSetup: (setup: TacticSetup) => void
  /** Üst istatistik karoları (UT: Rating/Dolu, kariyer: Ort. OVR/Dolu). */
  stats: { label: string; value?: string | number; suffix?: string }[]
  averages: FaceAverage[]
  /** UT'de kimya çubuğu; kariyerde kimya yok. */
  chem?: { value: number; max: number }
  /** Modun kendi bölümleri (UT: meta/fiyat; kariyer: rol uyumu). */
  sections?: ReactNode
  tacticCode: ReactNode
  onClear: () => void
  clearDisabled: boolean
  clearLabel?: string
  note?: string
  actions?: ReactNode
  /** Saha görünümü seçici (kariyer Lab: Kart/Piyon); kendi etiketli satırında, temizle/eylem düğmelerinden ayrı (FAZ 6a-H). Verilmezse yok. */
  viewToggle?: ReactNode
  header?: ReactNode
  /** Kadro adı alanının localStorage anahtarı (F6); verilmezse alan görünmez. */
  squadNameKey?: string
  /** Squad rating yıldızı (0-5, yarım adım); yaklaşık gösterilir. */
  ratingStars?: number
  /** "Tüm kadro ortalamaları" açılır bölümünün ek satırları (OVR, rol uyumu vb.). */
  allAverages?: { label: string; value?: string | number }[]
  /** Sahayı itmeyen, kapatılabilir tek satırlık not (yan panelin üstünde; F5). */
  notice?: { id: string; text: ReactNode }
  footer?: ReactNode
}

/** Slot seçili değilken yan panel varsayılan hâli (08 §16.1): kadro bilgisi, kimya, mod bölümleri, taktik kodu. Boş değerler "–". */
const NOTE_KEY = 'fc.note.'

/** Tek satırlık (≤ 48px) kapatılabilir not; kapatma tercihi localStorage'da (erişilemezse yalnız oturumluk). */
function DismissibleNote({ id, children }: { id: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(NOTE_KEY + id) === '1'
    } catch {
      return false
    }
  })
  if (hidden) {
    return null
  }
  return (
    <div role="note" className="glass-3 mb-3 flex max-h-12 items-center justify-between gap-2 overflow-hidden px-3 py-1 text-xs text-ink-2">
      <span className="min-w-0 flex-1 leading-4">{children}</span>
      <button
        type="button"
        aria-label="Notu kapat"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(NOTE_KEY + id, '1')
          } catch {
            /* depolama yoksa yalnız bu oturumda gizli kalır */
          }
        }}
        className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--glass-hover)] max-sm:min-h-11 max-sm:min-w-11"
      >
        ×
      </button>
    </div>
  )
}

function SquadName({ storageKey }: { storageKey: string }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? ''
    } catch {
      return ''
    }
  })
  return (
    <label className="block text-sm text-ink-2">
      Kadro adı
      <input
        value={name}
        maxLength={40}
        placeholder="Kadroya bir ad ver"
        onChange={(e) => {
          setName(e.target.value)
          try {
            localStorage.setItem(storageKey, e.target.value)
          } catch {
            /* depolama yoksa ad yalnız bu oturumda durur */
          }
        }}
        className="glass-3 mt-1 min-h-10 w-full px-3 text-sm text-ink placeholder:text-muted max-sm:min-h-11"
      />
    </label>
  )
}

/** Squad rating yıldızları: rating/20, yarım adımla; yaklaşık (EA'nın yıldız eşikleri doğrulanmadı). */
function RatingStars({ rating }: { rating: number }) {
  const stars = Math.min(5, Math.max(0, Math.round((rating / 20) * 2) / 2))
  return (
    <div role="img" aria-label={`Squad rating yıldızı: ${stars} / 5 (yaklaşık)`} title="Yaklaşık: rating / 20" className="flex items-center gap-0.5 text-warn">
      {[1, 2, 3, 4, 5].map((i) => (stars >= i ? <Star key={i} size={16} fill="currentColor" aria-hidden="true" /> : stars >= i - 0.5 ? <StarHalf key={i} size={16} fill="currentColor" aria-hidden="true" /> : <Star key={i} size={16} className="text-faint" aria-hidden="true" />))}
    </div>
  )
}

function SquadInfo(p: SquadViewProps) {
  return (
    <div className="space-y-4">
      {p.notice && <DismissibleNote id={p.notice.id}>{p.notice.text}</DismissibleNote>}
      {p.squadNameKey && <SquadName storageKey={p.squadNameKey} />}
      <section aria-label="Kadro bilgisi" className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <label htmlFor="v3-formation" className="text-ink-2">Formasyon</label>
          {p.formationsLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : p.formationsError ? (
            <span role="alert" className="text-bad">{p.formationsError}</span>
          ) : (
            <select id="v3-formation" value={p.formationId} onChange={(e) => p.onFormation(e.target.value)} className="glass-3 min-h-10 max-w-[220px] px-3 text-sm text-ink max-sm:min-h-11">
              {p.formations.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-ink-2">Build-Up</span>
          <Segmented label="Build-Up" value={p.setup.buildUp} options={BUILD_UPS.map((b) => ({ id: b, label: b }))} onChange={(buildUp) => p.onSetup({ ...p.setup, buildUp })} />
        </div>
        <label className="block text-sm text-ink-2">
          Savunma hattı: <span className="font-[var(--font-num)] tabular-nums text-ink">{p.setup.depth}</span>
          <input type="range" min={0} max={100} value={p.setup.depth} onChange={(e) => p.onSetup({ ...p.setup, depth: Number(e.target.value) })} className="mt-1 block w-full accent-[var(--accent)]" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {p.stats.map((s) => (
            <StatTile key={s.label} label={s.label} value={s.value} suffix={s.suffix} />
          ))}
        </div>
        {p.ratingStars !== undefined && p.ratingStars > 0 && <RatingStars rating={p.ratingStars} />}
        <div className="grid grid-cols-3 gap-2">
          {p.averages.map((a) => (
            <StatTile key={a.label} label={a.label} value={a.value === undefined ? undefined : `${a.approximate ? '≈' : ''}${a.value}`} />
          ))}
        </div>
        <details className="glass-3 px-3 py-2 text-sm">
          <summary className="min-h-8 cursor-pointer font-medium text-ink-2">Tüm kadro ortalamaları</summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {[...p.averages.map((a) => ({ label: a.label, value: a.value === undefined ? undefined : `${a.approximate ? '≈' : ''}${a.value}` })), ...(p.allAverages ?? [])].map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <dt className="text-muted">{row.label}</dt>
                <dd className="font-[var(--font-num)] tabular-nums text-ink">{row.value ?? '–'}</dd>
              </div>
            ))}
          </dl>
        </details>
        <p className="flex items-center gap-1 text-xs text-muted">
          Saha oyuncusu ortalaması
          <HelpPopover label="Yüz ortalaması nasıl hesaplanır">Altı ortalama yalnız saha oyuncularından hesaplanır; kaleci (DIV/HAN/KIC/REF/SPD/POS) dışarıda kalır. "≈": değer ağırlığı doğrulanmamış formülle hesaplandı.</HelpPopover>
        </p>
      </section>

      {p.chem && (
        <section aria-label="Toplam kimya" className="space-y-2">
          <h3 className="font-display text-lg font-semibold">Toplam kimya</h3>
          <ChemBar value={p.chem.value} max={p.chem.max} />
          <p className="text-xs text-muted">Kimya dökümü (lig / ülke / kulüp): henüz hesaplanmıyor.</p>
        </section>
      )}

      {p.sections}

      <section aria-label="EA taktik kodu">{p.tacticCode}</section>

      {p.viewToggle && (
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="text-xs font-medium text-ink-2">Saha görünümü</span>
          {p.viewToggle}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={p.onClear} disabled={p.clearDisabled} disabledReason="Kadro zaten boş">{p.clearLabel ?? "Kartları temizle"}</Button>
        {p.actions}
      </div>
      {p.note && <p role="status" className="text-xs text-accent">{p.note}</p>}
    </div>
  )
}

/**
 * v3 kadro çalışma alanı (V3-04, 08 §14-16): UT ve kariyerin ortak şablonu. Sahada tıklanan mevki yan paneli seçime çevirir;
 * mod yalnız `slotPanel`, `stats`, `sections` ve `actions` ile içerik verir.
 */
export function SquadWorkspaceView(p: SquadViewProps) {
  const mobile = useIsMobile()
  const sheet = mobile && p.slotPanel
  const focusSelector = p.selectedSlotId ? `[data-pitch-slot="${p.selectedSlotId}"]` : undefined
  return (
    <>
    <Workspace
      title={p.title}
      header={p.header}
      hero={
        <>
          <Pitch
            slots={p.slots.map((s) => ({ ...s, selected: s.slotId === p.selectedSlotId }))}
            onPickPlayer={p.onPickPlayer}
            onPickRole={p.onPickRole}
            onRemove={p.onRemove}
            onSwap={p.onSwap}
            eaCards={p.eaCards}
            field={p.field}
            marker={p.marker}
          />
          <p className="mt-2 px-1 text-xs text-muted">
            {p.pitchHint ?? (
              <>
                <span className="[@media(hover:none)]:hidden">Sürükle ya da <kbd className="rounded-sm border border-line px-1">M</kbd> ile taşı · Enter seç · Rol çipine tıkla: rol ve odak.</span>
                <span className="hidden [@media(hover:none)]:inline">Mevkiye dokun → kart seç · Rol çipine dokun → rol ve odak.</span>
              </>
            )}
          </p>
          {p.footer}
        </>
      }
      side={
        p.slotPanel && !mobile ? (
          <SidePanel title={p.slotPanel.title} onClose={p.slotPanel.onClose}>
            {p.slotPanel.body}
          </SidePanel>
        ) : (
          <SidePanel title="Kadro bilgisi">
            <SquadInfo {...p} />
          </SidePanel>
        )
      }
    />
    {sheet && p.slotPanel && (
      <MobileSheet title={p.slotPanel.title} onClose={p.slotPanel.onClose} restoreFocusTo={focusSelector}>
        {p.slotPanel.body}
      </MobileSheet>
    )}
    </>
  )
}

/** Rol çipine tıklayınca açılan rol/odak penceresi: iki modda aynı. */
export function SquadRoleDialog<T>({ ws }: { ws: SquadWorkspaceApi<T> }) {
  const slot = ws.selection?.panel === 'role' ? ws.selectedSlot : undefined
  if (!slot) {
    return null
  }
  return (
    <RoleFocusModal
      position={slot.position}
      groups={roleGroups(ws.roles.data ?? [], slot.position, ws.eaRoles.allowed)}
      lock={ws.eaRoles.status === 'ready' ? undefined : { status: ws.eaRoles.status, retry: ws.eaRoles.retry }}
      currentRoleId={ws.roleBySlot.get(slot.slotId)?.roleId ?? ws.state.roleOverride[slot.slotId] ?? slot.defaultRole}
      onApply={(roleId) => {
        ws.setRole(slot.slotId, roleId)
        ws.clearSelection()
      }}
      onClose={ws.clearSelection}
    />
  )
}
