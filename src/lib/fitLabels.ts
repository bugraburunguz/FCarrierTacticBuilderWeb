import type { WeaponState } from '../api/types'
import type { FitState } from '../components/card/FitBadge'
import { FIT_STATE_OF, toneOf } from './fitTone'

/** Kariyer ekranlarının (saha rozeti, PickList, öneriler, İhtiyaçlar) TEK sözlüğü; etiket ve açıklama başka yerde yazılmaz. */

export type FitLabel = 'GOOD' | 'AT_LEVEL' | 'WEAK' | 'WRONG_ROLE'

/** Eşiğe göre karar sunucudadır (fitLabel); web yalnız etiketi okur. Zayıf halka = sarı (WEAK) ve kırmızı (WRONG_ROLE). */
export const isWeakFit = (label?: FitLabel | null): boolean => label === 'WEAK' || label === 'WRONG_ROLE'

export const signedWhole = (value: number): string => {
  const whole = Math.round(value)
  return whole > 0 ? `+${whole}` : whole === 0 ? '0' : String(whole)
}

export const levelText = (value: number) => `Seviyesine göre %${Math.round(value)}`
export const rolePointsText = (value: number) => `Rol puanı ${Math.round(value)}`
export const futureText = (value: number) => `Gelecek sezon ${Math.round(value)}`
export const deltaText = (value: number) => `Mevcut oyuncuya göre ${signedWhole(value)}`
export const ovrGapText = (value: number) => `İlk 11 ortalamasına göre ${signedWhole(value)}`

export const FIT_HELP = {
  level: 'Oyuncunun kendi OVR seviyesindeki oyunculara göre bu role uyumu. Rozet rengi bu değerden gelir.',
  rolePoints: 'Rolün istediği özelliklerle oyuncunun özelliklerinin ham eşleşmesi (0-100). Seviyeden bağımsızdır.',
  future: 'Bir sezonluk gelişim/yaşlanma sonrası aynı rol puanı. Potansiyel gizli modunda gösterilmez.',
  delta: 'Bu mevkideki mevcut oyuncunun AYNI roldeki puanıyla fark.',
  ovrGap: 'Oyuncunun OVR\'si ile senin ilk 11 ortalaman arasındaki fark; yüksekse bu seviyeye inmesi zordur.',
} as const

export interface FitInput {
  levelFit?: number | null
  currentFit?: number | null
  score?: number | null
  fitLabel?: FitLabel | null
  badge?: WeaponState | null
}

export interface FitDisplay {
  /** Gösterilen yüzde: seviyesine göre (levelFit); yoksa rol puanı. */
  pct: number
  state: FitState
  rolePoints: number
}

/** Aynı RoleFit → her ekranda aynı sayı ve rozet durumu. */
export function fitDisplay(fit: FitInput): FitDisplay {
  const rolePoints = Math.round(fit.currentFit ?? fit.score ?? 0)
  const pct = Math.round(fit.levelFit ?? fit.currentFit ?? fit.score ?? 0)
  const state: FitState = fit.fitLabel ? { GOOD: 'good', AT_LEVEL: 'neutral', WEAK: 'ok', WRONG_ROLE: 'bad' }[fit.fitLabel] as FitState : FIT_STATE_OF[toneOf(fit.badge)]
  return { pct, state, rolePoints }
}

/** Rozet metinleri (kısa metin + erişilebilir ad): FitBadge dahil her yer buradan okur. */
export const FIT_STATE_TEXT: Record<FitState, { text: string; label: string }> = {
  good: { text: 'UYGUN', label: 'Rol için uygun' },
  ok: { text: 'SINIRDA', label: 'Rol için sınırda' },
  bad: { text: 'EKSİK', label: 'Rol için eksik' },
  neutral: { text: 'SEVİYESİNDE', label: 'Rol için seviyesinde' },
}

/** "Biçilmiş kaftan": yalnız sunucu `tailored` derse (levelFit eşiği sunucuda). */
export const TAILORED_TEXT = 'Biçilmiş kaftan'
export const TAILORED_BADGE = { text: 'BİÇİLMİŞ KAFTAN', label: 'Rol için biçilmiş kaftan' } as const

/** Kadro düzeyi uyum etiketi (replika uygulama, kadro özeti): tek yerde yazılır. */
export const SQUAD_FIT_TEXT = 'Kadro uyumu'
