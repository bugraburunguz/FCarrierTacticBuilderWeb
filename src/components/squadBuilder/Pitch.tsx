import { useEffect, useRef, useState } from 'react'
import { ovrBand } from '../../lib/squadBuilder'
import { PositionCard, type SlotView } from './PositionCard'

interface Props {
  slots: SlotView[]
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove?: (slotId: string) => void
  /** Sürükle-bırak: oyuncu başka bir slota bırakılınca iki slotun oyuncuları yer değiştirir (hedef boşsa taşınır). Mevki değil oyuncu taşınır. */
  onSwap?: (fromSlotId: string, toSlotId: string) => void
}

interface Drag {
  slotId: string
  x: number
  y: number
  over?: string
}

const DRAG_THRESHOLD = 6

function slotAt(x: number, y: number): string | undefined {
  const element = document.elementsFromPoint(x, y).find((el) => (el as HTMLElement).dataset?.slotCard !== undefined) as HTMLElement | undefined
  return element?.dataset.slotCard
}

/** Dikey saha, atak yukarı (ST üstte, GK altta). */
export function Pitch({ slots, onPickPlayer, onPickRole, onRemove, onSwap }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const start = useRef<{ slotId: string; x: number; y: number } | null>(null)
  const moved = useRef(false)
  const swapRef = useRef(onSwap)
  swapRef.current = onSwap

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const origin = start.current
      if (!origin) {
        return
      }
      if (!moved.current && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < DRAG_THRESHOLD) {
        return
      }
      moved.current = true
      setDrag({ slotId: origin.slotId, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) })
    }
    function onUp(e: PointerEvent) {
      const origin = start.current
      start.current = null
      if (origin && moved.current) {
        const target = slotAt(e.clientX, e.clientY)
        if (target && target !== origin.slotId) {
          swapRef.current?.(origin.slotId, target)
        }
        // sürüklemenin ardından gelen click'i yut
        setTimeout(() => {
          moved.current = false
        }, 0)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const dragged = drag ? slots.find((s) => s.slotId === drag.slotId) : undefined

  return (
    <div className="relative aspect-[3/3.6] overflow-hidden rounded-2xl border border-emerald-800 bg-gradient-to-b from-[#123420] to-[#0e2a1a]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 360" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="#2f5b3e" strokeWidth="1.2">
          <rect x="6" y="6" width="288" height="348" rx="10" />
          <line x1="6" y1="180" x2="294" y2="180" />
          <circle cx="150" cy="180" r="34" />
          <rect x="95" y="6" width="110" height="54" />
          <rect x="95" y="300" width="110" height="54" />
        </g>
      </svg>
      {slots.map((view) => (
        <PositionCard
          key={view.slotId}
          view={view}
          onPickPlayer={() => {
            if (!moved.current) {
              onPickPlayer(view.slotId)
            }
          }}
          onPickRole={() => onPickRole(view.slotId)}
          onRemove={onRemove && (() => onRemove(view.slotId))}
          onGrab={
            onSwap
              ? (e) => {
                  if (e.button !== 0) {
                    return
                  }
                  moved.current = false
                  start.current = { slotId: view.slotId, x: e.clientX, y: e.clientY }
                }
              : undefined
          }
          dragSource={drag?.slotId === view.slotId}
          dropActive={Boolean(drag) && drag?.over === view.slotId && drag?.slotId !== view.slotId}
        />
      ))}
      {drag && dragged?.player && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-emerald-300 bg-slate-800 px-1 py-2 text-center text-white shadow-2xl"
          style={{ left: drag.x, top: drag.y }}
        >
          <div className="text-[11px] font-extrabold" style={{ color: ovrBand(dragged.player.overall) }}>
            {dragged.player.overall}
          </div>
          <div className="truncate text-[11.5px] font-bold">{dragged.player.name}</div>
        </div>
      )}
    </div>
  )
}
