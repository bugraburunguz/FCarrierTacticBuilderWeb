import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PlayerCard, type CardPlayer } from '../card/PlayerCard'
import type { FitState } from '../card/FitBadge'
import { layoutPitch } from './layout'
import { shortRoleLabel } from './shortRole'

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
  /** Salt okunur (replika önizlemesi): slotlar etkileşimsiz, boş slot mevki yazar, rol etiketi düğme değildir. */
  readOnly?: boolean
}

interface Drag {
  slotId: string
  x: number
  y: number
  over?: string
}

const DRAG_THRESHOLD = 6
/** Dar ekran sınırı: altında rol etiketi tek satırlık kısa forma iner (F1). */
const NARROW_PX = 480
/** Dar olmayan sahada (≥480px, tablet dahil) saha görünür yüksekliğe ölçeklenir; altta ipucu satırı + dolgu için ayrılan px. */
const RESERVE_BELOW = 48
const MIN_FIELD_HEIGHT = 360

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
export function Pitch({ slots, onPickPlayer, onPickRole, onRemove, onSwap, readOnly = false }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [fieldWidth, setFieldWidth] = useState(560)
  const [available, setAvailable] = useState<number>()
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<string>()
  const [moving, setMoving] = useState<string>()
  const start = useRef<{ slotId: string; x: number; y: number } | null>(null)
  const moved = useRef(false)
  const swapRef = useRef(onSwap)
  swapRef.current = onSwap

  // Genişlik kapsayıcıdan, yükseklik (iki sütunlu düzende) görünür pencereden: saha kaydırma gerektirmeden sığar.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) {
      return undefined
    }
    const measure = () => {
      setFieldWidth(box.getBoundingClientRect().width)
      const top = box.getBoundingClientRect().top + window.scrollY
      setAvailable(box.getBoundingClientRect().width >= NARROW_PX ? Math.max(MIN_FIELD_HEIGHT, window.innerHeight - top - RESERVE_BELOW) : undefined)
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(box)
    observer?.observe(document.body) // üstteki içerik (banner, yüklenen başlık) kayınca saha yüksekliği yeniden hesaplanır
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
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

  // Slot grubu (kart + rol + mevki) tek birimdir; bantlar formasyon katmanlarından, çakışmasız (Q17).
  const layout = useMemo(
    () => layoutPitch({ slots: slots.map((s) => ({ slotId: s.slotId, x: s.x, y: s.y })), width: fieldWidth, height: available, narrow: fieldWidth < NARROW_PX, minCard: fieldWidth < NARROW_PX ? 48 : window.innerWidth >= 1024 ? 56 : 52 }),
    [slots, fieldWidth, available],
  )
  const { cardWidth, labelWidth, labelMode, fieldHeight } = layout
  const boxById = useMemo(() => new Map(layout.boxes.map((b) => [b.slotId, b])), [layout])
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

  const W = fieldWidth
  const H = fieldHeight
  const inset = 8
  const boxW = Math.min(W * 0.593, W - 2 * inset)
  const boxD = Math.min(H * 0.157, H / 4)
  const goalW = W * 0.27
  const goalD = Math.min(H * 0.052, H / 8)
  const circle = Math.min(W * 0.1346, H * 0.0871)

  return (
    <div ref={boxRef} className="pitch-field relative w-full" style={{ height: fieldHeight }}>
      <div className="absolute inset-0 overflow-hidden rounded-md border border-grass-900 bg-grass-700">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {STRIPES.map((i) => (
          <rect key={i} x="0" y={(i * H) / STRIPES.length} width={W} height={H / STRIPES.length} fill={i % 2 === 0 ? 'var(--pitch-a, var(--color-grass-700))' : 'var(--pitch-b, var(--color-grass-500))'} opacity={i % 2 === 0 ? 1 : 0.85} />
        ))}
        <g fill="none" stroke="var(--pitch-line, var(--color-chalk))" strokeWidth="2" opacity="0.8">
          <rect x={inset} y={inset} width={W - 2 * inset} height={H - 2 * inset} />
          <line x1={inset} y1={H / 2} x2={W - inset} y2={H / 2} />
          <circle cx={W / 2} cy={H / 2} r={circle} />
          <rect x={(W - boxW) / 2} y={inset} width={boxW} height={boxD} />
          <rect x={(W - boxW) / 2} y={H - inset - boxD} width={boxW} height={boxD} />
          <rect x={(W - goalW) / 2} y={inset} width={goalW} height={goalD} />
          <rect x={(W - goalW) / 2} y={H - inset - goalD} width={goalW} height={goalD} />
        </g>
        <g fill="var(--pitch-line, var(--color-chalk))" opacity="0.8">
          <circle cx={W / 2} cy={H / 2} r="3" />
        </g>
      </svg>
      </div>

      {moving && (
        <p role="status" className="absolute left-2 top-2 z-20 rounded-sm bg-ink-950/85 px-2 py-1 font-display text-xs font-semibold tracking-wide text-flood-400">
          TAŞIMA MODU · oklarla hedef, Enter bırak, Esc iptal
        </p>
      )}

      {slots.map((slot) => {
        const box = boxById.get(slot.slotId)
        if (!box) {
          return null
        }
        const dimmed = Boolean(hovered) && hover !== slot.slotId && !shares(hovered, slot.player)
        const linked = Boolean(hovered) && hover !== slot.slotId && shares(hovered, slot.player)
        const isOver = Boolean(drag) && drag?.over === slot.slotId && drag?.slotId !== slot.slotId
                return (
          <div key={slot.slotId} data-slot-group={slot.slotId} className="absolute flex flex-col items-center text-center" style={{ left: box.cx - box.width / 2, top: box.top, width: box.width, height: box.height, opacity: drag?.slotId === slot.slotId ? 0.35 : dimmed ? 0.45 : 1 }}>
            <div className="group relative inline-block">
            <div
              role={readOnly ? 'group' : 'button'}
              tabIndex={readOnly ? undefined : 0}
              data-pitch-slot={slot.slotId}
              aria-label={`${slot.position} — ${slot.player ? `${slot.player.name}, ${slot.player.rating}` : 'boş'}.${readOnly ? '' : moving === slot.slotId ? ' Taşınıyor.' : ' Oyuncu seç, M ile taşı.'}`}
              aria-pressed={readOnly ? undefined : moving === slot.slotId}
              onClick={readOnly ? undefined : () => {
                if (!moved.current) {
                  onPickPlayer(slot.slotId)
                }
              }}
              onKeyDown={readOnly ? undefined : (e) => onKey(e, slot.slotId)}
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
              className={`relative inline-block ${readOnly ? '' : 'cursor-pointer'} rounded-md outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-flood-400 ${isOver || slot.selected || moving === slot.slotId ? 'ring-2 ring-flood-400' : linked ? 'ring-2 ring-flood-400/70' : ''}`}
              style={{ touchAction: slot.player && onSwap ? 'pan-y' : undefined }}
            >
              {slot.player ? (
                <PlayerCard player={slot.player} width={cardWidth} chem={slot.chem} fit={slot.fit} price={slot.price} minText={11} minRating={14} />
              ) : (
                <span className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-chalk/70 bg-grass-900/40 font-display text-chalk" style={{ width: cardWidth, height: Math.round(cardWidth * 1.39) }}>
                  {readOnly ? <span className="font-mono text-xs">{slot.position}</span> : <span className="text-xl leading-none">+</span>}
                </span>
              )}
            </div>
            {slot.player && onRemove && (
              <button
                type="button"
                aria-label={`${slot.player.name} kartını kaldır`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(slot.slotId)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-sm bg-ink-950 text-xs font-bold text-paper-50 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
              >
                ×
              </button>
            )}
            </div>
            {slot.roleLabel && (readOnly ? (
              <span title={slot.roleLabel} style={{ width: labelWidth, marginTop: 12 }} className="mx-auto block rounded-sm bg-ink-950/80 px-1.5 py-0.5 text-center text-xs font-semibold leading-tight text-paper-50">
                  {labelMode === 'one' ? (
                    <span className="block whitespace-nowrap">{shortRoleLabel(slot.roleLabel)}</span>
                  ) : (
                    <span className="block break-words">{slot.roleLabel}</span>
                  )}
              </span>
            ) : (
              <button
                type="button"
                aria-label={slot.roleLabel}
                title={slot.roleLabel}
                onClick={(e) => {
                  e.stopPropagation()
                  onPickRole?.(slot.slotId)
                }}
                style={{ width: labelWidth, marginTop: 12 }} className="mx-auto block rounded-sm bg-ink-950/80 px-1.5 py-0.5 text-center text-xs font-semibold leading-tight text-paper-50 hover:bg-ink-950"
              >
                {labelMode === 'one' ? (
                  <span className="block whitespace-nowrap">{shortRoleLabel(slot.roleLabel)}</span>
                ) : (
                  <span className="block break-words">{slot.roleLabel}</span>
                )}
              </button>
            ))}
            <span data-slot-pill className="mt-0.5 block rounded-sm bg-ink-950/80 px-1.5 font-mono text-xs leading-[18px] text-paper-50">{slot.position}</span>
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
