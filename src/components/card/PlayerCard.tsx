import { langOfNationality } from '../../lib/nameCase'
import { useId, useState } from 'react'
import { assetUrl } from '../../lib/assetUrl'
import { displayName, useAssetName } from '../../lib/assetNames'
import { designFor, shortLabel, type CardKind } from '../../lib/cardDesign'
import { ChemDiamonds } from './ChemDiamonds'
import { FitBadge, type FitState } from './FitBadge'

export const BASE_W = 180
export const BASE_H = 250

const SIZE_WIDTH = { xs: 60, sm: 92, md: 124, lg: 180 } as const
export type CardSize = keyof typeof SIZE_WIDTH

export interface CardPlayer extends CardKind {
  name: string
  /** V3-05d-c: EA assetId verilirse ad katalogdan (/players/assets) çözülür; yakalanan ad yalnız yedek. */
  assetId?: number
  rating: number
  position?: string
  faceUrl?: string
  nationality?: string
  club?: string
  league?: string
  /** Yüz statları (PAC/SHO/PAS/DRI/DEF/PHY ya da kaleci karşılıkları) ve etiketleri. */
  faceStats?: number[]
  faceLabels?: string[]
  /** Hesaplanan ve ağırlığı doğrulanmamış değerler "≈" ile işaretlenir. */
  faceStatsApproximate?: boolean
  weakFoot?: number
  skillMoves?: number
}

export interface PlayerCardProps {
  player: CardPlayer
  size?: CardSize
  /** Piksel genişliği; verilirse `size` yok sayılır. */
  width?: number
  chem?: 0 | 1 | 2 | 3
  fit?: { pct: number; state: FitState }
  price?: string
  className?: string
  /**
   * Okunabilirlik kapısı (Q18, her boyutta varsayılan 11): ölçeklenmiş yazı bu px'in altına inecekse o öğe gizlenir.
   * Açıkça verilirse (saha) soyad ölçekli alanda değil, kartın alt şeridinde sabit ≥ minText px yazılır ve hiç gizlenmez.
   */
  minText?: number
  /** OVR'nin ölçeklenmiş en küçük px'i (varsayılan 14); küçük kartta OVR büyütülür. */
  minRating?: number
  /** Yalnız ölçüm hikâyesi (card-width-probe): çip/stat genişlik eşiklerini yok sayar; yazı tabanları aynen uygulanır. */
  probe?: boolean
}

/** Q18: kart içi yazı ≥ 11px, OVR ≥ 14px (11 §8). */
export const CARD_MIN_TEXT = 11
export const CARD_MIN_RATING = 14
const NAME_MIN_WIDTH = 72
/**
 * Stat ve çip yazısı küçük kartta ölçekle küçülmez, ≥ 11px tabana oturur; sığdıkları en küçük kart genişliği
 * gerçek tarayıcıda ölçüldü (scripts/card-width-probe.mjs, Ladle `PlayerCard` hikâyesi). Bu genişliğin altında gizlenir.
 */
export const STATS_MIN_WIDTH = 118
export const META_MIN_WIDTH = 140
/** Stat şeridinin yatay iç boşluğu (taban px). */
const STATS_INSET = 16

const FRAME_PATH = 'M90 2 C122 2 160 10 176 24 L176 196 C176 214 150 232 90 248 C30 232 4 214 4 196 L4 24 C20 10 58 2 90 2 Z'

/**
 * Tek oyuncu kartı (DS-05): 180×250 taban tasarım, boyut `transform: scale` ile ölçeklenir; böylece her boyutta oranlar sabit kalır.
 * Çerçeve kendi SVG'miz; portre yoksa ya da yüklenmezse silüet çizilir.
 */
export function PlayerCard({ player, size = 'md', width, chem, fit, price, className = '', minText, minRating = CARD_MIN_RATING, probe = false }: PlayerCardProps) {
  const uid = useId().replace(/:/g, '')
  const [failed, setFailed] = useState(false)
  const catalogName = useAssetName(player.assetId)
  const w = width ?? SIZE_WIDTH[size]
  const scale = w / BASE_W
  const design = designFor(player.rating, player)
  const { look } = design
  const textFloor = minText ?? CARD_MIN_TEXT
  const readable = (basePx: number) => basePx * scale >= textFloor
  // Saha (minText açıkça verilir): isim alt şeritte sabit ≥ minText px, asla gizlenmez. Diğer kartlarda ölçekli isim okunamıyorsa gizlenir.
  const nameStrip = minText !== undefined && minText > 0
  const showName = !nameStrip && w >= NAME_MIN_WIDTH && readable(21)
  const showPosition = readable(19)
  // Gizleme son çare: çip ve stat yazısı tabana oturur (ölçekli taban px = max(tasarım, eşik / ölçek)); yalnız ölçülmüş genişliğin altında gizlenir.
  const floored = (basePx: number) => Math.max(basePx, textFloor / scale)
  const showMeta = (probe || w >= META_MIN_WIDTH) && !nameStrip
  const showStats = (probe || w >= STATS_MIN_WIDTH) && !nameStrip && Boolean(player.faceStats?.length)
  const ratingBase = Math.max(46, minRating / scale)
  const face = assetUrl(player.faceUrl)
  // Ad: katalog (assetId) → yakalanan gerçek ad → "ST 84" (title "Ad bilinmiyor"); şerit asla yalnız rakam olmaz (Q18).
  const shown = displayName(catalogName, player.name, player.position, player.rating)
  const surname = shown.strip
  const nameLang = langOfNationality(player.nationality)
  const tags = [player.nationality, player.club, player.league].map(shortLabel)

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{ width: w, height: BASE_H * scale }}
      role="img"
      aria-label={`${shown.full ?? `${shown.strip} (ad bilinmiyor)`}, ${player.rating}${player.position ? `, ${player.position}` : ''}${player.club ? `, ${player.club}` : ''}`}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, color: look.ink }}>
        <svg viewBox={`0 0 ${BASE_W} ${BASE_H}`} width={BASE_W} height={BASE_H} className="absolute inset-0" aria-hidden="true">
          <defs>
            <linearGradient id={`f${uid}`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor={look.frame[0]} />
              <stop offset="0.55" stopColor={look.frame[1]} />
              <stop offset="1" stopColor={look.frame[2]} />
            </linearGradient>
            <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={look.shine} />
              <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <clipPath id={`c${uid}`}>
              <path d={FRAME_PATH} />
            </clipPath>
          </defs>
          {design.mode === 'EA_ASSET' && design.backgroundUrl ? (
            <image href={design.backgroundUrl} width={BASE_W} height={BASE_H} preserveAspectRatio="none" />
          ) : (
            <>
              <path d={FRAME_PATH} fill={`url(#f${uid})`} />
              <g clipPath={`url(#c${uid})`}>
                <path d="M-20 60 L200 -10 L200 40 L-20 120 Z" fill={`url(#s${uid})`} opacity="0.9" />
                <path d="M-20 150 L200 80 L200 100 L-20 180 Z" fill={look.shine} opacity="0.25" />
              </g>
              <path d={FRAME_PATH} fill="none" stroke={look.rule} strokeWidth="2" />
              <path d="M90 8 C120 8 154 15 169 27 L169 195 C169 210 146 226 90 240 C34 226 11 210 11 195 L11 27 C26 15 60 8 90 8 Z" fill="none" stroke={look.rule} strokeWidth="1" opacity="0.7" />
            </>
          )}
        </svg>

        <div className="absolute font-display leading-none" style={{ left: 24, top: 38 }}>
          <div style={{ fontSize: ratingBase, fontWeight: 800 }}>{player.rating}</div>
          {player.position && showPosition && <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>{player.position}</div>}
          {showMeta && (
            <div data-card-chips className="mt-2 flex flex-col gap-1" style={{ fontSize: floored(9), fontWeight: 700, lineHeight: 1 }}>
              {tags.filter(Boolean).map((tag, i) => (
                <span key={i} className="flex items-center justify-center overflow-hidden rounded-full" style={{ width: 24, height: Math.max(17, floored(9) + 4), border: `1px solid ${look.rule}`, background: 'rgba(255,255,255,.18)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="absolute flex items-end justify-center overflow-hidden" style={{ left: 66, top: 22, width: 100, height: 112 }}>
          {face && !failed ? (
            <img src={face} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain object-bottom" />
          ) : (
            <svg viewBox="0 0 100 112" width="100" height="112" aria-hidden="true" opacity="0.5">
              <circle cx="50" cy="40" r="20" fill="currentColor" />
              <path d="M10 112 C10 76 28 64 50 64 C72 64 90 76 90 112 Z" fill="currentColor" />
            </svg>
          )}
        </div>

        {showName && (
          <div className="absolute left-0 right-0 text-center font-display" style={{ top: 141, padding: '0 30px' }}>
            <div lang={nameLang} title={shown.title} className="truncate uppercase" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>
              {surname}
            </div>
            <div style={{ height: 1, background: look.rule, margin: '5px auto 0', width: '78%' }} />
          </div>
        )}

        {showStats && (
          <div data-card-stats className="absolute grid grid-cols-6 text-center font-display" style={{ left: STATS_INSET, right: STATS_INSET, top: 176 }}>
            {player.faceStats!.slice(0, 6).map((value, i) => (
              <div key={i} className="min-w-0 overflow-hidden" style={{ lineHeight: 1 }}>
                <div style={{ fontSize: floored(15), fontWeight: 700 }}>{player.faceStatsApproximate ? '≈' : ''}{value}</div>
                <div style={{ fontSize: floored(8), fontWeight: 600, opacity: 0.8, marginTop: 2 }}>{player.faceLabels?.[i] ?? ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {nameStrip && (
        <div
          data-card-name
          lang={nameLang}
          title={shown.title}
          className="absolute left-0 right-0 truncate text-center font-display font-extrabold uppercase leading-none"
          style={{ top: BASE_H * scale * (141 / BASE_H), padding: '0 6%', fontSize: Math.max(textFloor, 21 * scale), color: look.ink }}
        >
          {surname}
        </div>
      )}
      {fit && <FitBadge state={fit.state} pct={fit.pct} className="absolute -right-1 -top-1" compact={w < 100} />}
      {(chem !== undefined || price) && (
        <div className="absolute left-0 right-0 flex items-center justify-center gap-1" style={{ bottom: -Math.max(8, w * 0.1) }}>
          {chem !== undefined && <ChemDiamonds value={chem} size={Math.max(7, Math.round(w * 0.11))} />}
          {price && <span className="num rounded-[3px] bg-ink-950/85 px-1 text-[11px] font-medium text-flood-400">{price}</span>}
        </div>
      )}
    </div>
  )
}
