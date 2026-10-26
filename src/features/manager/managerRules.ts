import type { ClubCategory, ManagerBackground, ManagerDifficulty, ManagerLicence, ManagerPriority, ManagerProfile, ManagerStyle, ReplicaApproach, ReplicaBuildUp } from '../../api/types'

/** Seçenek: kart/segment etiketi ve altında tek satır açıklama. */
export interface ManagerOption<T extends string> {
  id: T
  label: string
  hint: string
}

/** Antrenörlük diploması (FM): açıklamalar aynı ölçekte, tek satır. */
export const LICENCES: ManagerOption<ManagerLicence>[] = [
  { id: 'NONE', label: 'Yok', hint: 'Şu an antrenörlük için gereken lisansa sahip değil.' },
  { id: 'NATIONAL_C', label: 'Ulusal C', hint: 'Temel eğitim; alt liglerde ve altyapıda iş bulur.' },
  { id: 'NATIONAL_B', label: 'Ulusal B', hint: 'Kulüp düzeyinde çalışmaya yeter; tecrübesi sınırlı görülür.' },
  { id: 'NATIONAL_A', label: 'Ulusal A', hint: 'Ulusal düzeyde saygın; üst liglere kapı aralar.' },
  { id: 'INTERNATIONAL_C', label: 'Uluslararası C', hint: 'Uluslararası eğitime başladı; yurt dışı kulüpler fark eder.' },
  { id: 'INTERNATIONAL_B', label: 'Uluslararası B', hint: 'Uluslararası alanda güvenilir bir eğitim geçmişi.' },
  { id: 'INTERNATIONAL_A', label: 'Uluslararası A', hint: 'Üst düzey bilgi; büyük kulüpler ciddiye alır.' },
  { id: 'PRO', label: 'Uluslararası Pro Lisans', hint: 'Futbol bilgisi en yüksek derecede kabul edilir, dünyanın her yerinde çalışabilir.' },
]

/** Futbolculuk geçmişi (FM metinlerinden kısaltıldı). */
export const BACKGROUNDS: ManagerOption<ManagerBackground>[] = [
  { id: 'AMATEUR', label: 'Amatör küme', hint: 'Kimse tanımaz; yönetim sabırlı, büyük kulüpler temkinli.' },
  { id: 'SEMI_PRO', label: 'Yarı profesyonel', hint: 'Az tanınır; bazı efsaneler de dipten başladı.' },
  { id: 'PRO_LOCAL', label: 'Profesyonel (yerel)', hint: 'Basın ilgilenir; büyük kulüpte beklenti baskısı ağır.' },
  { id: 'PRO_REGIONAL', label: 'Profesyonel (bölgesel)', hint: 'Kısa vadede esneklik tanınır, sonra sonuç beklenir.' },
  { id: 'PRO_NATIONAL', label: 'Profesyonel (ulusal)', hint: 'Yönetim rahat emanet eder; kısa vadeli başarısızlık görmezden gelinebilir ama beklenti yüksek.' },
  { id: 'INTERNATIONAL', label: 'Milli takım (uluslararası)', hint: 'Daha çok kulüp kapı açar; beklenti yüksek, hızlı başarı istenir.' },
  { id: 'WORLD_CLASS', label: 'Milli takım (dünya çapında)', hint: 'En itibarlı kulüpler ister; beklenti en üst seviyede.' },
]

export const STYLES: ManagerOption<ManagerStyle>[] = [
  { id: 'POSSESSION', label: 'Topa sahip olma', hint: 'Kısa pasla sabırlı oyun kurma.' },
  { id: 'BALANCED', label: 'Dengeli', hint: 'Duruma göre; orta blok.' },
  { id: 'COUNTER', label: 'Kontra', hint: 'Derin blok, hızlı geçiş.' },
  { id: 'HIGH_PRESS', label: 'Yüksek pres', hint: 'Önde baskı, yüksek savunma hattı.' },
]

export const PRIORITIES: ManagerOption<ManagerPriority>[] = [
  { id: 'YOUTH', label: 'Gençler', hint: 'Altyapısı güçlü, genç yetenekli kulüpler öne çıkar.' },
  { id: 'QUICK_SUCCESS', label: 'Hızlı başarı', hint: 'Kadrosu ligine göre güçlü, güvenli kulüpler öne çıkar.' },
  { id: 'FINANCIAL', label: 'Finansal güç', hint: 'Ligine göre zengin kulüpler öne çıkar.' },
  { id: 'RESCUE', label: 'Kurtarma görevi', hint: 'Kadrosu itibarının gerisinde kalmış kulüpler öne çıkar.' },
]

export const DIFFICULTIES: ManagerOption<ManagerDifficulty>[] = [
  { id: 'EASY', label: 'Kolay', hint: 'Kadrosu ligine göre güçlü kulüpler.' },
  { id: 'MEDIUM', label: 'Orta', hint: 'Dengeli görevler.' },
  { id: 'HARD', label: 'Zor', hint: 'Kadrosu zayıf ya da beklentisi yüksek kulüpler.' },
]

export const MAX_PRIORITIES = 2

export const CATEGORY_LABEL: Record<ClubCategory, string> = {
  BEST_FIT: 'Tarzına en uygun',
  YOUTH_PROJECT: 'Gençlik projesi',
  RESCUE: 'Kurtarma görevi',
  STRONG_BUDGET: 'Bütçesi güçlü',
  SAFE: 'İtibarına göre güvenli',
  DREAM: 'Hayal kulübü',
}

export const label = <T extends string>(options: ManagerOption<T>[], id: T | undefined) => options.find((o) => o.id === id)?.label

/**
 * Canlı özet için itibar tablosu: backend `fcareer.manager` (ManagerProperties) varsayılanlarının aynısı (verified:false, "FM esinli,
 * kalibre edilmedi"). Kaydedince sunucunun hesabı gösterilir; burası yalnız kaydetmeden önceki önizleme.
 */
const BACKGROUND_BASE: Record<ManagerBackground, number> = {
  AMATEUR: 5, SEMI_PRO: 15, PRO_LOCAL: 30, PRO_REGIONAL: 40, PRO_NATIONAL: 55, INTERNATIONAL: 70, WORLD_CLASS: 85,
}
const LICENCE_BONUS: Record<ManagerLicence, number> = {
  NONE: 0, NATIONAL_C: 2, NATIONAL_B: 4, NATIONAL_A: 6, INTERNATIONAL_C: 8, INTERNATIONAL_B: 10, INTERNATIONAL_A: 12, PRO: 15,
}
const MAX_REPUTATION = 100

export function reputation(background: ManagerBackground | undefined, licence: ManagerLicence | undefined): number | undefined {
  return background && licence ? Math.min(MAX_REPUTATION, BACKGROUND_BASE[background] + LICENCE_BONUS[licence]) : undefined
}

/** Bant: backend ManagerRules.band ile aynı eşikler. */
const BANDS: [number, string, string][] = [
  [20, 'Tanınmıyor', 'Küçük kulüpler bile temkinli; önce kendini kanıtlaman gerekir.'],
  [40, 'Yerel tanınırlık', 'Küçük kulüpler kapı açar; büyük kulüpler temkinli.'],
  [60, 'Ulusal tanınırlık', 'Orta sınıf kulüpler ilgilenir; büyük kulüpler hâlâ temkinli.'],
  [85, 'Uluslararası tanınırlık', 'Çok kulüp kapı açar; beklenti yüksek, hızlı başarı istenir.'],
  [Infinity, 'Dünya çapında', 'En itibarlı kulüpler ister; beklenti en üst seviyede.'],
]
const bandRow = (value: number) => BANDS.find(([below]) => value < below)!

export const band = (value: number) => bandRow(value)[1]
/** Canlı özetteki beklenti satırı. */
export const outlook = (value: number) => bandRow(value)[2]

/** Öncelik en çok 2: seçili olan çıkarılır; doluyken üçüncüsü eklenmez. */
export function togglePriority(list: ManagerPriority[], priority: ManagerPriority): ManagerPriority[] {
  if (list.includes(priority)) {
    return list.filter((p) => p !== priority)
  }
  return list.length >= MAX_PRIORITIES ? list : [...list, priority]
}

/** Replika kısayolu: build-up ve savunma yaklaşımı tarza (backend ManagerRules.setup'ın tersi). */
export function styleFromReplica(buildUp: ReplicaBuildUp, approach: ReplicaApproach): ManagerStyle {
  if (buildUp === 'SHORT_PASSING') {
    return 'POSSESSION'
  }
  if (buildUp === 'COUNTER') {
    return 'COUNTER'
  }
  return approach === 'HIGH' || approach === 'AGGRESSIVE' ? 'HIGH_PRESS' : 'BALANCED'
}

/** Form taslağı: geçmiş ve diploma seçilene kadar boş. */
export interface ManagerDraft {
  name: string
  licence?: ManagerLicence
  background?: ManagerBackground
  formation?: string
  style: ManagerStyle
  priorities: ManagerPriority[]
  difficulty: ManagerDifficulty
  leagueId?: number
  gender?: number
}

export const emptyDraft = (): ManagerDraft => ({ name: '', style: 'BALANCED', priorities: [], difficulty: 'MEDIUM' })

/** Sunucu boş alanları null döner: taslağa yalnız dolu alanlar girer (null filtre `gender=null` isteğine dönüşmesin). */
export const draftOf = (profile: ManagerProfile): ManagerDraft => ({
  ...emptyDraft(),
  ...Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== null && v !== undefined)),
  name: profile.name ?? '',
})

export function validate(draft: ManagerDraft): string[] {
  return [
    ...(draft.background ? [] : ['Futbolculuk geçmişini seç.']),
    ...(draft.licence ? [] : ['Antrenörlük diplomasını seç.']),
  ]
}

/** PUT gövdesi: boş ad ve seçilmemiş filtreler gönderilmez. validate() boşken çağrılır. */
export function toProfile(draft: ManagerDraft): ManagerProfile {
  const name = draft.name.trim()
  return {
    ...(name ? { name } : {}),
    licence: draft.licence!,
    background: draft.background!,
    ...(draft.formation ? { formation: draft.formation } : {}),
    style: draft.style,
    priorities: draft.priorities,
    difficulty: draft.difficulty,
    ...(draft.leagueId !== undefined ? { leagueId: draft.leagueId } : {}),
    ...(draft.gender !== undefined ? { gender: draft.gender } : {}),
  }
}

/** Profil sonrası dönüş: yalnız bilinen hedefler (açık yönlendirme yok). */
export const RETURN_TO: Record<string, string> = { yeni: '/career/new', masa: '/career/dashboard' }
