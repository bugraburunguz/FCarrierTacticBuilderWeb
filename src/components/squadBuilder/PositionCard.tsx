import type { WeaponState } from '../../api/types'
import { BADGE_EMOJI } from '../../lib/format'
import { ovrBand } from '../../lib/squadBuilder'

export interface SlotView {
  slotId: string
  position: string
  x: number
  y: number
  player?: { id: number; name: string; overall: number }
  roleLabel: string
  fit?: { pct: number; band: WeaponState }
  placeholder?: string
  sub?: string
  selected?: boolean
}

const FIT_STYLE: Record<WeaponState, string> = {
  GREEN: 'bg-accent-soft text-ink',
  YELLOW: 'bg-code-soft text-code',
  RED: 'bg-danger-soft text-danger',
}

interface Props {
  view: SlotView
  onPickPlayer: () => void
  onPickRole: () => void
  onRemove?: () => void
  onGrab?: (event: React.PointerEvent) => void
  dragSource?: boolean
  dropActive?: boolean
}

export function PositionCard({ view, onPickPlayer, onPickRole, onRemove, onGrab, dragSource, dropActive }: Props) {
  const { player, fit } = view
  return (
    <div data-slot-card={view.slotId} className={`group absolute w-[74px] -translate-x-1/2 -translate-y-1/2 text-center min-[520px]:w-[92px] ${dragSource ? 'opacity-40' : ''}`} style={{ left: `${view.x}%`, top: `${view.y}%` }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${view.position} — ${player ? `${player.name}, ${player.overall}` : 'boş'}. Oyuncu seç`}
        onClick={onPickPlayer}
        onPointerDown={player && onGrab ? onGrab : undefined}
        style={player && onGrab ? { touchAction: 'none', cursor: 'grab' } : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPickPlayer()
          }
        }}
        className={`relative cursor-pointer rounded-[10px] border bg-gradient-to-br from-slate-700 to-slate-900 px-1 pb-1.5 pt-1.5 text-white transition hover:-translate-y-0.5 hover:border-accent focus-visible:border-accent focus-visible:outline-none ${dropActive ? 'border-accent ring-2 ring-accent' : view.selected ? 'border-line ring-2 ring-line' : 'border-line'}`}
      >
        <span className="absolute left-1.5 top-1 text-[9px] font-extrabold text-accent">{view.position}</span>
        {player && (
          <span className="absolute right-1.5 top-1 text-[11px] font-extrabold" style={{ color: ovrBand(player.overall) }}>
            {player.overall}
          </span>
        )}
        {player ? <div className="mt-3.5 truncate text-[11.5px] font-bold">{player.name}</div> : <div className="mt-2.5 text-xl text-muted">{view.placeholder ?? '+'}</div>}
        {player && view.sub && <div className="truncate text-[9px] text-muted">{view.sub}</div>}
        {fit && (
          <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-extrabold ${FIT_STYLE[fit.band]}`}>
            {BADGE_EMOJI[fit.band]} %{fit.pct}
          </span>
        )}
      </div>
      {player && onRemove && (
        <button
          type="button"
          aria-label={`${player.name} oyuncusunu slottan kaldır`}
          title="Kaldır"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-ink-900 text-[11px] font-bold leading-none text-ink hover:border-danger-line hover:bg-danger hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
        >
          ✕
        </button>
      )}
      {view.roleLabel && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPickRole()
        }}
        aria-label={`${view.position} rolü: ${view.roleLabel}. Rol ve odak seç`}
        className="mt-2.5 inline-block max-w-full cursor-pointer truncate rounded-[5px] border border-teal-800 bg-teal-950 px-1 py-0.5 text-[9.5px] text-teal-200 hover:border-line hover:text-code"
      >
        {view.roleLabel}
      </button>
      )}
    </div>
  )
}
