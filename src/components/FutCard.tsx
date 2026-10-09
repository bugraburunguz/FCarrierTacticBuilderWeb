import { useState } from 'react'
import { cardTier, shortLabel, TIER_STYLE, type FutInfo } from '../lib/futCard'

interface Props extends FutInfo {
  name: string
  rating: number
  position?: string
  /** Kartın piksel genişliği; yazı boyutları buna göre ölçeklenir. */
  width?: number
  footer?: string
  className?: string
}

/** FC Ultimate Team kartı: rating + mevki solda, oyuncu yüzü, ad ve ülke/kulüp/lig etiketleri. Yüz yoksa baş harfler gösterilir. */
export function FutCard({ name, rating, position, width = 96, footer, className = '', ...info }: Props) {
  const [failed, setFailed] = useState(false)
  const style = TIER_STYLE[cardTier(rating, info)]
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(-2).join('').toUpperCase()
  const tags = [info.nationality, info.club, info.league].map(shortLabel).filter(Boolean)
  return (
    <div
      className={`relative select-none overflow-hidden ${className}`}
      style={{
        width,
        height: width * 1.36,
        fontSize: width / 10,
        color: style.ink,
        background: style.bg,
        clipPath: 'polygon(50% 0, 92% 7%, 100% 14%, 100% 88%, 50% 100%, 0 88%, 0 14%, 8% 7%)',
        filter: 'drop-shadow(0 .15em .25em rgba(0,0,0,.45))',
      }}
      title={`${name} · ${rating}${position ? ` · ${position}` : ''}${info.club ? ` · ${info.club}` : ''}`}
    >
      <div className="absolute leading-none" style={{ left: '1.5em', top: '2.2em' }}>
        <div style={{ fontSize: '2.3em', fontWeight: 800 }}>{rating}</div>
        {position && <div style={{ fontSize: '1em', fontWeight: 700, marginTop: '.2em' }}>{position}</div>}
      </div>
      <div className="absolute flex items-end justify-center" style={{ right: '.6em', top: '1.4em', width: '6.6em', height: '6.6em' }}>
        {info.faceUrl && !failed ? (
          <img src={info.faceUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-contain object-bottom" />
        ) : (
          <span style={{ fontSize: '2.6em', fontWeight: 800, opacity: 0.55, alignSelf: 'center' }}>{initials}</span>
        )}
      </div>
      <div className="absolute left-0 right-0 text-center" style={{ top: '8.4em', padding: '0 .8em' }}>
        <div className="truncate" style={{ fontSize: '1.15em', fontWeight: 800, letterSpacing: '.02em', textTransform: 'uppercase' }}>{name.split(' ').slice(-1)[0]}</div>
        <div style={{ height: '.1em', margin: '.25em auto .2em', width: '70%', background: style.line }} />
        <div className="truncate" style={{ fontSize: '.85em', fontWeight: 600 }}>{tags.join(' · ')}</div>
        {footer && <div className="truncate" style={{ fontSize: '.8em', fontWeight: 700, marginTop: '.1em' }}>{footer}</div>}
      </div>
    </div>
  )
}
