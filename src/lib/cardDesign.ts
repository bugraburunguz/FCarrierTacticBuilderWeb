export type CardTier = 'bronze' | 'silver' | 'gold' | 'icon' | 'hero' | 'totw' | 'special'

export interface CardLook {
  /** Kart çerçevesi gradyan durakları (üst → alt). */
  frame: [string, string, string]
  /** Rating, ad ve sayılar. */
  ink: string
  /** İnce çizgiler ve ayraçlar. */
  rule: string
  /** İç parlama bandı. */
  shine: string
  foil: boolean
}

/** Kartın görsel kimliği: `OWN` kendi SVG çerçevemiz; `EA_ASSET` yalnız arka plan adresi yapılandırıldığında (08 D-23) kullanılır, yoksa OWN'a düşer. */
export interface CardDesign {
  tier: CardTier
  look: CardLook
  mode: 'OWN' | 'EA_ASSET'
  backgroundUrl?: string
}

export interface CardKind {
  cardType?: 'ICON' | 'HERO' | 'HOF'
  rarity?: string
}

const PLAIN_RARITIES = /^(common|rare|bronze|silver|gold)?$/i

/** Normal kartlar rating bandına göre, ICON/HERO/TOTW/özel kartlar kendi renginde. */
export function cardTier(rating: number, kind: CardKind = {}): CardTier {
  if (kind.cardType === 'ICON' || kind.cardType === 'HOF') {
    return 'icon'
  }
  if (kind.cardType === 'HERO') {
    return 'hero'
  }
  const rarity = (kind.rarity ?? '').trim()
  if (/team of the week|totw|in-?form/i.test(rarity)) {
    return 'totw'
  }
  if (!PLAIN_RARITIES.test(rarity.replace(/\s*(common|rare)$/i, ''))) {
    return 'special'
  }
  return rating >= 75 ? 'gold' : rating >= 65 ? 'silver' : 'bronze'
}

export const TIER_LOOK: Record<CardTier, CardLook> = {
  gold: { frame: ['#f8e9a0', '#d9b44a', '#9c7a22'], ink: '#3a2a06', rule: 'rgba(58,42,6,.35)', shine: 'rgba(255,255,255,.35)', foil: false },
  silver: { frame: ['#f1f4f8', '#bcc4cf', '#7c8594'], ink: '#1d2530', rule: 'rgba(29,37,48,.35)', shine: 'rgba(255,255,255,.45)', foil: false },
  bronze: { frame: ['#e8bd96', '#b27545', '#74421f'], ink: '#2f1809', rule: 'rgba(47,24,9,.35)', shine: 'rgba(255,255,255,.28)', foil: false },
  icon: { frame: ['#fff7dc', '#e3d19a', '#a38f52'], ink: '#3a2f10', rule: 'rgba(58,47,16,.35)', shine: 'rgba(255,255,255,.55)', foil: true },
  hero: { frame: ['#d9a6ff', '#8a45f0', '#3a1a85'], ink: '#ffffff', rule: 'rgba(255,255,255,.4)', shine: 'rgba(255,255,255,.3)', foil: true },
  totw: { frame: ['#4a4f5e', '#1c1f28', '#07080c'], ink: '#f2d572', rule: 'rgba(242,213,114,.45)', shine: 'rgba(255,255,255,.14)', foil: true },
  special: { frame: ['#7aeaf9', '#2f6bea', '#1d1b63'], ink: '#ffffff', rule: 'rgba(255,255,255,.4)', shine: 'rgba(255,255,255,.3)', foil: true },
}

/** `VITE_CARD_BG_BASE` tanımlıysa ve mod EA_ASSET ise arka plan o adresten; aksi halde kendi çerçevemiz. */
export function designFor(rating: number, kind: CardKind = {}): CardDesign {
  const tier = cardTier(rating, kind)
  const base = (import.meta.env.VITE_CARD_BG_BASE as string | undefined)?.replace(/\/$/, '')
  const eaMode = (import.meta.env.VITE_CARD_MODE as string | undefined) === 'EA_ASSET'
  return { tier, look: TIER_LOOK[tier], mode: eaMode && base ? 'EA_ASSET' : 'OWN', backgroundUrl: eaMode && base ? `${base}/${tier}.png` : undefined }
}

/** Kart alt satırında sığacak kısa etiket (ülke/kulüp/lig için ilk 3 harf). */
export function shortLabel(value?: string): string {
  return value ? value.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 3).toUpperCase() : ''
}
