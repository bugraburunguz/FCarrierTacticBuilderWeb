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

/**
 * FIT-1 madde 1 (Buğra kararı): iki metrik, iki ayrı ad. Güç = currentFit (0–100, mutlak: oyuncu o slotta ne kadar etkili).
 * Rol oturması = levelFit (0–100, göreli: profili, kendi seviyesindekilere göre rol için ne kadar tipik). Takım düzeyi: Takım gücü ve Rol oturması.
 */
export const FIT_TERMS = {
  strength: { name: 'Güç', team: 'Takım gücü', help: 'Güç: oyuncunun bu slottaki rolde ne kadar etkili olduğu (0–100, mutlak). Takım gücü 11 oyuncunun ortalaması.' },
  roleFit: { name: 'Rol oturması', team: 'Rol oturması', help: 'Rol oturması: oyuncunun profilinin, kendi OVR seviyesindeki oyunculara göre bu rol için ne kadar tipik olduğu (0–100, göreli).' },
} as const

export type FitMetric = typeof FIT_TERMS.strength.name | typeof FIT_TERMS.roleFit.name

/** Kariyer ekranları (FIT-1): "Rol oturması %38", "Güç 65". */
export const roleFitText = (value: number) => `${FIT_TERMS.roleFit.name} %${Math.round(value)}`
export const strengthText = (value: number) => `${FIT_TERMS.strength.name} ${Math.round(value)}`
/** FIT-2 madde 6: "Daha uygun rol: Inside Forward (Attack) · oturma %71" (norm yoksa "· Güç 70"). */
export const betterRoleText = (alt: { roleName: string; currentFit: number; levelFit?: number | null }) =>
  `Daha uygun rol: ${alt.roleName} · ${alt.levelFit === undefined || alt.levelFit === null ? strengthText(alt.currentFit) : `oturma %${Math.round(alt.levelFit)}`}`

/** FIT-2: rol alternatifinin metni — Rol oturması varsa o, norm yoksa Güç. */
export const alternativeFitText = (fit: { currentFit: number; levelFit?: number | null }) =>
  (fit.levelFit === undefined || fit.levelFit === null ? strengthText(fit.currentFit) : roleFitText(fit.levelFit))

/** UT ekranlarının eski adları (UT görünümü değişmez); kariyer roleFitText/strengthText kullanır. */
export const levelText = (value: number) => `Seviyesine göre %${Math.round(value)}`
export const rolePointsText = (value: number) => `Rol puanı ${Math.round(value)}`
export const futureText = (value: number) => `Gelecek sezon ${Math.round(value)}`
export const deltaText = (value: number) => `Mevcut oyuncuya göre ${signedWhole(value)}`
export const ovrGapText = (value: number) => `İlk 11 ortalamasına göre ${signedWhole(value)}`

export const FIT_HELP = {
  level: `${FIT_TERMS.roleFit.help} Rozet rengi bu değerden gelir.`,
  rolePoints: FIT_TERMS.strength.help,
  // Not: FIT_HELP yalnız kariyer öneri satırlarında; UT ROLES_HELP aşağıda değişmedi.
  future: 'Bir sezonluk gelişim/yaşlanma sonrası aynı rol puanı. Potansiyel gizli modunda gösterilmez.',
  delta: 'Bu mevkideki mevcut oyuncunun AYNI roldeki puanıyla fark.',
  ovrGap: 'Oyuncunun OVR\'si ile senin ilk 11 ortalaman arasındaki fark; yüksekse bu seviyeye inmesi zordur.',
} as const

/** UT oyuncu sayfası Roller sekmesinin tek yardımı: satırda yüzde yalnız rozette, açıklama burada. */
export const ROLES_HELP = {
  badge: 'Rozet: oyuncunun kendi seviyesindeki oyunculara göre bu roldeki uygunluğu.',
  rolePoints: 'Rol puanı: rol vektörüne göre ham uygunluk.',
} as const

/** Kariyer oyuncu sayfası › Roller (FIT-1): aynı iki metrik, kariyer adlarıyla. */
export const CAREER_ROLES_HELP = {
  badge: `Rozetteki yüzde: ${FIT_TERMS.roleFit.help}`,
  rolePoints: FIT_TERMS.strength.help,
} as const

export interface FitInput {
  levelFit?: number | null
  currentFit?: number | null
  score?: number | null
  fitLabel?: FitLabel | null
  badge?: WeaponState | null
}

export interface FitDisplay {
  /** Rozette gösterilen yüzde: Rol oturması (levelFit); yoksa Güç. Adı `metric`. */
  pct: number
  state: FitState
  /** Güç (currentFit); `strength` ile aynı, eski adı. */
  rolePoints: number
  /** Güç (currentFit, 0–100). */
  strength: number
  /** Rol oturması (levelFit, 0–100); norm yoksa yok. */
  roleFit?: number
  /** `pct`'nin adı: rozet title/aria metninde yazılır. */
  metric: FitMetric
}

/** Aynı RoleFit → her ekranda aynı sayı ve rozet durumu (FIT-1: tek kaynak). */
export function fitDisplay(fit: FitInput): FitDisplay {
  const strength = Math.round(fit.currentFit ?? fit.score ?? 0)
  const roleFit = fit.levelFit === undefined || fit.levelFit === null ? undefined : Math.round(fit.levelFit)
  const state: FitState = fit.fitLabel ? { GOOD: 'good', AT_LEVEL: 'neutral', WEAK: 'ok', WRONG_ROLE: 'bad' }[fit.fitLabel] as FitState : FIT_STATE_OF[toneOf(fit.badge)]
  return { pct: roleFit ?? strength, state, rolePoints: strength, strength, roleFit, metric: roleFit === undefined ? FIT_TERMS.strength.name : FIT_TERMS.roleFit.name }
}

/** Rozet/kart title ve aria metni: hangi sayının ne olduğu adıyla ("Rol oturması %38 · Güç 65"). */
export function fitTitle(display: Pick<FitDisplay, 'strength' | 'roleFit'>): string {
  return display.roleFit === undefined ? strengthText(display.strength) : `${roleFitText(display.roleFit)} · ${strengthText(display.strength)}`
}

const average = (values: number[]) => (values.length === 0 ? undefined : Math.round(values.reduce((a, b) => a + b, 0) / values.length))

/** Takım gücü: dizilen oyuncuların Güç ortalaması. */
export const teamStrength = (displays: Pick<FitDisplay, 'strength'>[]) => average(displays.map((d) => d.strength))

/** Takım Rol oturması: oturması bilinen oyuncuların ortalaması. */
export const teamRoleFit = (displays: Pick<FitDisplay, 'roleFit'>[]) => average(displays.flatMap((d) => (d.roleFit === undefined ? [] : [d.roleFit])))

/** FIT-1 madde 2: iki eksenli zayıf halka sınıfı (sunucu /fit/lineup slot.weakClass; eşikler sunucuda). */
export type WeakClass = 'KALITE_ACIGI' | 'ROL_UYUMSUZ' | 'IKISI' | 'UYGUN'

export const WEAK_CLASS_TEXT: Record<Exclude<WeakClass, 'UYGUN'>, string> = {
  KALITE_ACIGI: 'Kalite açığı',
  ROL_UYUMSUZ: 'Rol uyumsuz',
  IKISI: 'Kalite açığı + rol uyumsuz',
}

/** FIT-1: sınıf önceliği (Masa kartları ve 3 iş aynı sırayı kullanır) — önce ikisi, sonra kalite açığı, sonra rol uyumsuzluğu. */
export const WEAK_CLASS_ORDER: Record<Exclude<WeakClass, 'UYGUN'>, number> = { IKISI: 0, KALITE_ACIGI: 1, ROL_UYUMSUZ: 2 }

/** Sınıflı zayıf halka sırası: sınıf önceliği, sonra Güç artan. */
export function compareWeakClass(a: { weakClass?: WeakClass; strength: number }, b: { weakClass?: WeakClass; strength: number }): number {
  const rank = (w?: WeakClass) => (w && w !== 'UYGUN' ? WEAK_CLASS_ORDER[w] : 0)
  return rank(a.weakClass) - rank(b.weakClass) || a.strength - b.strength
}

/** Zayıf halka mı: sunucu sınıfı varsa o; yoksa (eski sunucu) etiket kuralı. */
export const isWeakClass = (weakClass: WeakClass | undefined | null, label?: FitLabel | null): boolean =>
  weakClass ? weakClass !== 'UYGUN' : isWeakFit(label)

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
export const SQUAD_FIT_TEXT = FIT_TERMS.strength.team
/** UT ekranlarındaki takım değeri adı (FIT-1 adlandırması yalnız kariyerde). */
export const UT_SQUAD_FIT_TEXT = 'Kadro uyumu'
