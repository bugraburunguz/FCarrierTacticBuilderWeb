import type { CSSProperties } from 'react'
import { BADGE_EMOJI } from '../../lib/format'
import type { WeaponState } from '../../api/types'

export type Rarity = 'bronze' | 'silver' | 'gold' | 'totw' | 'icon' | 'hero' | 'evo'

interface Theme {
  bg: string
  txt: string
  label: string
}

/** Kart çerçeveleri tamamen bize ait gradient'ler; EA kart görseli kullanılmaz ve rehost edilmez. */
export const RARITY: Record<Rarity, Theme> = {
  bronze: { bg: 'linear-gradient(170deg,#7a5330,#43290f)', txt: '#f3d8b8', label: 'Bronze' },
  silver: { bg: 'linear-gradient(170deg,#9aa2ac,#515861)', txt: '#101418', label: 'Silver' },
  gold: { bg: 'linear-gradient(170deg,#d8ba4a,#6d5618)', txt: '#3a2c05', label: 'Gold' },
  totw: { bg: 'linear-gradient(170deg,#23242b,#0a0a0d)', txt: '#eaf6ff', label: 'TOTW / In-Form' },
  icon: { bg: 'linear-gradient(170deg,#f2e8cf,#c3a862)', txt: '#4a3a12', label: 'Icon' },
  hero: { bg: 'linear-gradient(170deg,#7d1636,#3a0a1a)', txt: '#ffd7e0', label: 'Hero' },
  evo: { bg: 'linear-gradient(170deg,#3a1d6b,#160a2e)', txt: '#e6dcff', label: 'Evolution' },
}

/** Kariyerde rarity OVR bandından türetilir (EA bantları: 0-64 bronze, 65-74 silver, 75+ gold). */
export function rarityFromOverall(overall: number): Rarity {
  if (overall >= 75) return 'gold'
  if (overall >= 65) return 'silver'
  return 'bronze'
}

const STAT_KEYS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const
const FIT_COLOR: Record<WeaponState, string> = { GREEN: '#7CFC9B', YELLOW: '#ffd24a', RED: '#ff8a7a' }

export interface FutCardAssets {
  face?: string
  nation?: string
  club?: string
  league?: string
}

export interface FutCardProps {
  name: string
  overall: number
  position: string
  rarity?: Rarity
  /** career: RoleFit rozeti; ut: kimya elması + PlayStyle+ */
  mode: 'career' | 'ut'
  fit?: { pct: number; band: WeaponState }
  chem?: number
  stats?: number[]
  foot?: string
  skillMoves?: number
  playstyles?: { total: number; plus: number }
  assets?: FutCardAssets
  variant?: 'pitch' | 'list' | 'detail'
}

const WIDTH: Record<NonNullable<FutCardProps['variant']>, number> = { pitch: 92, list: 120, detail: 176 }

function Slot({ src, label, round }: { src?: string; label: string; round?: boolean }) {
  const style: CSSProperties = { width: 16, height: 16, borderRadius: round ? '50%' : 4, border: src ? 'none' : '1px dashed rgba(255,255,255,.4)', fontSize: 6, opacity: 0.8 }
  return src ? <img src={src} alt={label} style={style} referrerPolicy="no-referrer" /> : <span style={style} className="flex items-center justify-center">{label}</span>
}

export function FutCard({ name, overall, position, rarity, mode, fit, chem = 0, stats, foot = 'R', skillMoves, playstyles, assets, variant = 'detail' }: FutCardProps) {
  const theme = RARITY[rarity ?? rarityFromOverall(overall)]
  const scale = WIDTH[variant] / 176
  const compact = variant !== 'detail'
  return (
    <div
      role="img"
      aria-label={`${name}, ${overall} ${position}${fit ? `, rol uyumu %${fit.pct}` : ''}`}
      style={{ width: WIDTH[variant], background: theme.bg, color: theme.txt, padding: `${12 * scale}px ${11 * scale}px`, borderRadius: 14 * scale, boxShadow: '0 14px 34px rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.12)' }}
      className="relative overflow-hidden"
    >
      <div className="relative flex gap-2">
        <div className="flex min-w-[34px] flex-col items-center leading-none">
          <span style={{ fontSize: 26 * scale, fontWeight: 900 }}>{overall}</span>
          <span style={{ fontSize: 10 * scale, fontWeight: 800, opacity: 0.85, marginTop: 2 }}>{position}</span>
          {!compact && (
            <span style={{ fontSize: 8, opacity: 0.6, marginTop: 5 }}>
              {foot} · {skillMoves ?? '–'}★
            </span>
          )}
        </div>
        <div className="relative flex flex-1 items-end justify-center" style={{ height: 72 * scale }}>
          {mode === 'career' && fit ? (
            <span className="absolute right-0 top-0 rounded-full border border-white/25 bg-black/40 px-1.5 text-[10px] font-extrabold" style={{ color: FIT_COLOR[fit.band] }}>
              {BADGE_EMOJI[fit.band]} %{fit.pct}
            </span>
          ) : (
            mode === 'ut' && (
              <span className="absolute right-0 top-0 flex gap-0.5" aria-label={`Kimya ${chem}/3`}>
                {[0, 1, 2].map((i) => (
                  <i key={i} style={{ width: 9, height: 9, transform: 'rotate(45deg)', border: '1px solid rgba(255,255,255,.5)', background: i < chem ? '#7CFC9B' : 'transparent', boxShadow: i < chem ? '0 0 6px #7CFC9B' : 'none' }} />
                ))}
              </span>
            )
          )}
          {assets?.face ? (
            <img src={assets.face} alt="" style={{ height: 62 * scale }} referrerPolicy="no-referrer" />
          ) : (
            <span className="flex items-center justify-center text-[9px] opacity-75" style={{ width: 56 * scale, height: 62 * scale, borderRadius: '50% 50% 46% 46%/58% 58% 42% 42%', background: 'linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.05))', border: '1px dashed rgba(255,255,255,.35)' }}>
              yüz
            </span>
          )}
        </div>
      </div>
      <div className="relative my-2 truncate border-y border-white/20 py-1 text-center font-extrabold" style={{ fontSize: Math.max(11, 14 * scale) }}>
        {name}
      </div>
      {stats && stats.length === 6 && variant !== 'pitch' && (
        <div className="grid grid-cols-3 gap-x-0.5 gap-y-1">
          {STAT_KEYS.map((k, i) => (
            <div key={k} className="text-center">
              <div className="text-sm font-extrabold leading-none">{stats[i]}</div>
              <div style={{ fontSize: 8, opacity: 0.7 }}>{k}</div>
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            <Slot src={assets?.nation} label="NAT" />
            <Slot src={assets?.club} label="CLB" />
            <Slot src={assets?.league} label="LGE" round />
          </div>
          {playstyles && playstyles.total > 0 && (
            <div className="flex gap-0.5" aria-label={`${playstyles.total} PlayStyle, ${playstyles.plus} tanesi PS+`}>
              {Array.from({ length: playstyles.total }).map((_, i) => (
                <i
                  key={i}
                  className="flex items-center justify-center rounded-full text-[8px] font-extrabold not-italic"
                  style={{ width: 15, height: 15, background: i < playstyles.plus ? 'linear-gradient(135deg,#ffd24a,#ff8a3a)' : 'rgba(0,0,0,.35)', color: i < playstyles.plus ? '#2a1400' : 'inherit', border: i < playstyles.plus ? 'none' : '1px solid rgba(255,255,255,.45)' }}
                >
                  {i < playstyles.plus ? '+' : '•'}
                </i>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
