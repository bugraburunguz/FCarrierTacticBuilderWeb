import { useEffect, useMemo, useRef, useState } from 'react'
import { PlayerCard, type CardPlayer } from '../card/PlayerCard'
import type { FitState } from '../card/FitBadge'

export interface PitchSlot {
  slotId: string
  position: string
  /** Yüzde cinsinden konum (0-100); atak yukarı, kaleci aşağıda. */
  x: number
  y: number
  player?: CardPlayer
  chem?: 0 | 1 | 2 | 3
  fit?: { pct: number; state: FitState }
  price?: string
  roleLabel?: string
  selected?: boolean
}

interface Props {
  slots: PitchSlot[]
  onPickPlayer: (slotId: string) => void
  onPickRole?: (slotId: string) => void
  onRemove?: (slotId: string) => void
  /** Sürükle-bırak ya da klavye taşıma modu: iki slotun oyuncuları yer değiştirir (hedef boşsa taşınır). */
  onSwap?: (fromSlotId: string, toSlotId: string) => void
}

interface Drag {
  slotId: string
  x: number
  y: number
  over?: string
}

const DRAG_THRESHOLD = 6
const CARD_RATIO = 0.155
const MIN_CARD = 44
const MAX_CARD = 96

function slotAt(x: number, y: number): string | undefined {
  const element = document.elementsFromPoint(x, y).find((el) => (el as HTMLElement).dataset?.pitchSlot !== undefined) as HTMLElement | undefined
  return element?.dataset.pitchSlot
}

function shares(a?: CardPlayer, b?: CardPlayer): boolean {
  if (!a || !b) {
    return false
  }
  return Boolean((a.club && a.club === b.club) || (a.league && a.league === b.league) || (a.nationality && a.nationality === b.nationality))
}

const STRIPES = Array.from({ length: 12 }, (_, i) => i)

/**
 * Dikey saha (68×105 oranı): biçilmiş çim şeritleri, kireç çizgileri, FC kartları.
 * Kimya bu sistemde bağlantıya değil sayıma (kulüp/lig/ülke) dayandığı için çizgi yerine: bir karta gelinince
 * aynı kulüp/lig/ülkeyi paylaşan kartlar vurgulanır, diğerleri sönükleşir.
 * Klavye: Tab ile slot, Enter seç, M taşıma modu (oklarla hedef, Enter bırak, Esc iptal).
 */
export function Pitch({ slots, onPickPlayer, onPickRole, onRemove, onSwap }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(72)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<string>()
  const [moving, setMoving] = useState<string>()
  const start = useRef<{ slotId: string; x: number; y: number } | null>(null)
  const moved = useRef(false)
  const swapRef = useRef(onSwap)
  swapRef.current = onSwap

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const observer = new ResizeObserver(([entry]) => setCardWidth(Math.round(Math.min(MAX_CARD, Math.max(MIN_CARD, entry.contentRect.width * CARD_RATIO)))))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

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

  const bySlot = useMemo(() => new Map(slots.map((s) => [s.slotId, s])), [slots])
  const hovered = hover ? bySlot.get(hover)?.player : undefined
  const dragged = drag ? bySlot.get(drag.slotId) : undefined

  function focusNeighbour(from: string, key: string) {
    const origin = bySlot.get(from)
    if (!origin) {
      return
    }
    const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
    const dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
    const next = slots
      .filter((s) => s.slotId !== from && (s.x - origin.x) * dx + (s.y - origin.y) * dy > 0)
      .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0]
    if (next) {
      boxRef.current?.querySelector<HTMLElement>(`[data-pitch-slot="${next.slotId}"]`)?.focus()
    }
  }

  function onKey(e: React.KeyboardEvent, slotId: string) {
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      setMoving((cur) => (cur === slotId ? undefined : slotId))
    } else if (e.key === 'Escape') {
      setMoving(undefined)
    } else if (e.key.startsWith('Arrow') && moving) {
      e.preventDefault()
      focusNeighbour(slotId, e.key)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (moving && moving !== slotId) {
        onSwap?.(moving, slotId)
        setMoving(undefined)
      } else if (moving === slotId) {
        setMoving(undefined)
      } else {
        onPickPlayer(slotId)
      }
    }
  }

  return (
    <div ref={boxRef} className="relative mx-auto aspect-[68/105] w-full max-w-[560px] overflow-hidden rounded-md border border-grass-900 bg-grass-700">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 680 1050" preserveAspectRatio="none" aria-hidden="true">
        {STRIPES.map((i) => (
          <rect key={i} x="0" y={i * 87.5} width="680" height="87.5" fill={i % 2 === 0 ? 'var(--color-grass-700)' : 'var(--color-grass-500)'} opacity={i % 2 === 0 ? 1 : 0.85} />
        ))}
        <g fill="none" stroke="var(--color-chalk)" strokeWidth="3" opacity="0.8">
          <rect x="30" y="30" width="620" height="990" />
          <line x1="30" y1="525" x2="650" y2="525" />
          <circle cx="340" cy="525" r="91" />
          <rect x="138" y="30" width="404" height="165" />
          <rect x="138" y="855" width="404" height="165" />
          <rect x="230" y="30" width="220" height="55" />
          <rect x="230" y="965" width="220" height="55" />
          <path d="M248 195 A91 91 0 0 0 432 195" />
          <path d="M248 855 A91 91 0 0 1 432 855" />
        </g>
        <g fill="var(--color-chalk)" opacity="0.8">
          <circle cx="340" cy="525" r="5" />
          <circle cx="340" cy="140" r="4" />
          <circle cx="340" cy="910" r="4" />
        </g>
      </svg>

      {moving && (
        <p role="status" className="absolute left-2 top-2 z-20 rounded-sm bg-ink-950/85 px-2 py-1 font-display text-xs font-semibold tracking-wide text-flood-400">
          TAŞIMA MODU · oklarla hedef, Enter bırak, Esc iptal
        </p>
      )}

      {slots.map((slot) => {
        const dimmed = Boolean(hovered) && hover !== slot.slotId && !shares(hovered, slot.player)
        const linked = Boolean(hovered) && hover !== slot.slotId && shares(hovered, slot.player)
        const isOver = Boolean(drag) && drag?.over === slot.slotId && drag?.slotId !== slot.slotId
        return (
          <div key={slot.slotId} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${slot.x}%`, top: `${slot.y}%`, opacity: drag?.slotId === slot.slotId ? 0.35 : dimmed ? 0.45 : 1 }}>
            <div
              role="button"
              tabIndex={0}
              data-pitch-slot={slot.slotId}
              aria-label={`${slot.position} — ${slot.player ? `${slot.player.name}, ${slot.player.rating}` : 'boş'}. ${moving === slot.slotId ? 'Taşınıyor.' : 'Oyuncu seç, M ile taşı.'}`}
              aria-pressed={moving === slot.slotId}
              onClick={() => {
                if (!moved.current) {
                  onPickPlayer(slot.slotId)
                }
              }}
              onKeyDown={(e) => onKey(e, slot.slotId)}
              onPointerDown={slot.player && onSwap ? (e) => {
                if (e.button !== 0) {
                  return
                }
                moved.current = false
                start.current = { slotId: slot.slotId, x: e.clientX, y: e.clientY }
              } : undefined}
              onMouseEnter={() => setHover(slot.slotId)}
              onMouseLeave={() => setHover(undefined)}
              onFocus={() => setHover(slot.slotId)}
              onBlur={() => setHover(undefined)}
              className={`group relative inline-block cursor-pointer rounded-md outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-flood-400 ${isOver || slot.selected || moving === slot.slotId ? 'ring-2 ring-flood-400' : linked ? 'ring-2 ring-flood-400/70' : ''}`}
              style={{ touchAction: slot.player && onSwap ? 'pan-y' : undefined }}
            >
              {slot.player ? (
                <PlayerCard player={slot.player} width={cardWidth} chem={slot.chem} fit={slot.fit} price={slot.price} />
              ) : (
                <span className="flex flex-col items-center justify-center rounded-full border-2 border-dashed border-chalk/70 bg-grass-900/40 font-display text-chalk" style={{ width: cardWidth * 0.8, height: cardWidth * 0.8 }}>
                  <span className="text-sm font-bold leading-none">{slot.position}</span>
                  <span className="text-lg leading-none">+</span>
                </span>
              )}
              {slot.player && onRemove && (
                <button
                  type="button"
                  aria-label={`${slot.player.name} kartını kaldır`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(slot.slotId)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -left-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-sm bg-ink-950 text-xs font-bold text-paper-50 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  ×
                </button>
              )}
            </div>
            {slot.roleLabel && slot.player && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPickRole?.(slot.slotId)
                }}
                className="mt-3 block max-w-[110px] truncate rounded-sm bg-ink-950/80 px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-wide text-paper-50 hover:bg-ink-950"
              >
                {slot.roleLabel}
              </button>
            )}
          </div>
        )
      })}

      {drag && dragged?.player && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 drop-shadow-xl" style={{ left: drag.x, top: drag.y }}>
          <PlayerCard player={dragged.player} width={cardWidth} />
        </div>
      )}
    </div>
  )
}
