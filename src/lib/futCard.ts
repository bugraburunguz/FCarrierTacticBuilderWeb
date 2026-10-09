export type CardTier = 'bronze' | 'silver' | 'gold' | 'icon' | 'hero' | 'totw' | 'special'

export interface FutInfo {
  faceUrl?: string
  cardType?: 'ICON' | 'HERO' | 'HOF'
  rarity?: string
  nationality?: string
  club?: string
  league?: string
}

const PLAIN_RARITIES = /^(common|rare|bronze|silver|gold)?$/i

/** Kart rengi: ICON/HERO/TOTW/özel kartlar kendi renginde, normal kartlar rating'e göre bronz/gümüş/altın. */
export function cardTier(rating: number, info: FutInfo = {}): CardTier {
  if (info.cardType === 'ICON' || info.cardType === 'HOF') {
    return 'icon'
  }
  if (info.cardType === 'HERO') {
    return 'hero'
  }
  const rarity = (info.rarity ?? '').trim()
  if (/team of the week|totw|in-?form/i.test(rarity)) {
    return 'totw'
  }
  if (!PLAIN_RARITIES.test(rarity.replace(/\s*(common|rare)$/i, ''))) {
    return 'special'
  }
  return rating >= 75 ? 'gold' : rating >= 65 ? 'silver' : 'bronze'
}

export const TIER_STYLE: Record<CardTier, { bg: string; ink: string; line: string }> = {
  gold: { bg: 'linear-gradient(155deg,#f3df8c 0%,#d3ab43 48%,#8f6c1f 100%)', ink: '#3b2a05', line: 'rgba(59,42,5,.35)' },
  silver: { bg: 'linear-gradient(155deg,#eef1f5 0%,#b4bcc8 48%,#717a89 100%)', ink: '#1f2630', line: 'rgba(31,38,48,.35)' },
  bronze: { bg: 'linear-gradient(155deg,#e2b48a 0%,#aa6c3c 48%,#6b3d1e 100%)', ink: '#2e1608', line: 'rgba(46,22,8,.35)' },
  icon: { bg: 'linear-gradient(155deg,#fbf4d9 0%,#dcc98f 48%,#9d894d 100%)', ink: '#3a2f10', line: 'rgba(58,47,16,.35)' },
  hero: { bg: 'linear-gradient(155deg,#d29bff 0%,#7c3aed 52%,#35167f 100%)', ink: '#ffffff', line: 'rgba(255,255,255,.35)' },
  totw: { bg: 'linear-gradient(155deg,#3a3f4d 0%,#16181f 55%,#05060a 100%)', ink: '#f0d36a', line: 'rgba(240,211,106,.4)' },
  special: { bg: 'linear-gradient(155deg,#5ee7f7 0%,#2563eb 52%,#1c1a5e 100%)', ink: '#ffffff', line: 'rgba(255,255,255,.35)' },
}

/** Kartın alt satırında sığacak kısa etiket (ülke/kulüp için ilk 3 harf). */
export function shortLabel(value?: string): string {
  return value ? value.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 3).toUpperCase() : ''
}
