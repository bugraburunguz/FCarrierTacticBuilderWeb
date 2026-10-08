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
  selected?: boolean
}

const FIT_STYLE: Record<WeaponState, string> = {
  GREEN: 'bg-emerald-900 text-emerald-200',
  YELLOW: 'bg-amber-900 text-amber-200',
  RED: 'bg-rose-900 text-rose-200',
}

interface Props {
  view: SlotView
  onPickPlayer: () => void
  onPickRole: () => void
}

export function PositionCard({ view, onPickPlayer, onPickRole }: Props) {
  const { player, fit } = view
  return (
    <div className="group absolute w-[74px] -translate-x-1/2 -translate-y-1/2 text-center min-[520px]:w-[92px]" style={{ left: `${view.x}%`, top: `${view.y}%` }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${view.position} — ${player ? `${player.name}, ${player.overall}` : 'boş'}. Oyuncu seç`}
        onClick={onPickPlayer}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPickPlayer()
          }
        }}
        className={`relative cursor-pointer rounded-[10px] border bg-gradient-to-br from-slate-700 to-slate-900 px-1 pb-1.5 pt-1.5 text-white transition hover:-translate-y-0.5 hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:outline-none ${view.selected ? 'border-amber-300 ring-2 ring-amber-300/60' : 'border-slate-600'}`}
      >
        <span className="absolute left-1.5 top-1 text-[9px] font-extrabold text-emerald-300">{view.position}</span>
        {player && (
          <span className="absolute right-1.5 top-1 text-[11px] font-extrabold" style={{ color: ovrBand(player.overall) }}>
            {player.overall}
          </span>
        )}
        {player ? <div className="mt-3.5 truncate text-[11.5px] font-bold">{player.name}</div> : <div className="mt-2.5 text-xl text-slate-400">{view.placeholder ?? '+'}</div>}
        {fit && (
          <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-extrabold ${FIT_STYLE[fit.band]}`}>
            {BADGE_EMOJI[fit.band]} %{fit.pct}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPickRole()
        }}
        aria-label={`${view.position} rolü: ${view.roleLabel}. Rol ve odak seç`}
        className="mt-2.5 inline-block max-w-full cursor-pointer truncate rounded-[5px] border border-teal-800 bg-teal-950 px-1 py-0.5 text-[9.5px] text-teal-200 hover:border-amber-300 hover:text-amber-300"
      >
        {view.roleLabel}
      </button>
    </div>
  )
}
