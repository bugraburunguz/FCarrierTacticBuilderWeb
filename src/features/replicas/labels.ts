import type { ReplicaApproach, ReplicaBuildUp, ReplicaCategory, ReplicaLeague, ReplicaSlotState } from '../../api/types'

/** Replika ekranlarının tek sözlüğü (kategori, lig, build-up, hat, slot durumu). */
export const CATEGORY_ORDER: ReplicaCategory[] = ['CURRENT', 'UCL_WINNER', 'LEGENDARY_SQUAD', 'LEGENDARY_COACH', 'UNDERRATED_COACH', 'TURKISH_BIG4', 'TURKISH_CHAMPION']

export const CATEGORY_LABEL: Record<ReplicaCategory, string> = {
  CURRENT: 'Güncel',
  UCL_WINNER: 'UCL şampiyonu',
  LEGENDARY_SQUAD: 'Efsane kadro',
  LEGENDARY_COACH: 'Efsane hoca',
  UNDERRATED_COACH: 'Gözden kaçan hoca',
  TURKISH_BIG4: 'Türk 4 büyükler',
  TURKISH_CHAMPION: 'Türk şampiyonlar',
}

export const LEAGUE_LABEL: Record<ReplicaLeague, string> = {
  TR_SUPER_LIG: 'Süper Lig',
  EN_PREMIER_LEAGUE: 'Premier League',
  EN_CHAMPIONSHIP: 'Championship',
  ES_LALIGA: 'LaLiga',
  IT_SERIE_A: 'Serie A',
  IT_SERIE_B: 'Serie B',
  DE_BUNDESLIGA: 'Bundesliga',
  FR_LIGUE_1: 'Ligue 1',
  NL_EREDIVISIE: 'Eredivisie',
  PT_LIGA: 'Liga Portugal',
  SCO_PREMIERSHIP: 'Scottish Premiership',
  AT_BUNDESLIGA: 'Avusturya Bundesliga',
}

export const BUILD_UP_LABEL: Record<ReplicaBuildUp, string> = {
  SHORT_PASSING: 'Kısa pas',
  BALANCED: 'Dengeli',
  COUNTER: 'Kontra',
}

export const APPROACH_LABEL: Record<ReplicaApproach, string> = {
  DEEP: 'Derin hat',
  BALANCED: 'Dengeli hat',
  HIGH: 'Yüksek hat',
  AGGRESSIVE: 'Agresif hat',
}

/** Sunucu seed'inde build-up/hat serbest metin olabilir (plan B); bilinmeyen değer olduğu gibi gösterilir. */
export const buildUpText = (value: string): string => BUILD_UP_LABEL[value as ReplicaBuildUp] ?? value
export const approachText = (value: string): string => APPROACH_LABEL[value as ReplicaApproach] ?? value

export const SLOT_STATE_TEXT: Record<ReplicaSlotState, string> = {
  GOOD: 'Uygun',
  AT_LEVEL: 'Seviyesinde',
  WEAK: 'Sınırda',
  WRONG_ROLE: 'Eksik',
  EMPTY: 'Boş',
}

/** Çeşitli kaynaklar: UT'de kulüp kartları, kariyerde kadro, hiçbiri yoksa katalog örneği. */
export const SOURCE_TEXT = {
  CAREER: 'Kariyer kadron',
  UT: 'Kulüp kartların',
  SAMPLE: 'Örnek kadro',
} as const

export const FINDINGS_TITLE = 'Bu taktiğin dikkat noktaları'

/** Kanıt satırlarında iç metrik kodu yerine okunur ad (kullanıcı metni iç kod içermez). */
export const EVIDENCE_LABEL: Record<string, string> = {
  REST_DEFENCE_COUNT: 'Geri savunmada kalan oyuncu',
  BAND_ORDINAL: 'Hat bandı',
  SIDE_FULLBACK_DYFWD_MAX: 'Bekin ileri çıkışı',
  CENTRAL_MIDFIELD_COUNT: 'Merkezi orta saha sayısı',
  BUILDUP_IS: 'Build-up seçili',
  ANCHOR_COUNT: 'Perde yapan oyuncu',
  WIDTH_INDEX: 'Genişlik göstergesi',
  STRIKER_RUNBEHIND_MAX: 'Forvetin arkaya koşusu',
  STAMINA_GAP: 'Dayanıklılık açığı',
  SIDE_WINGER_W_MAX: 'Kanat genişliği',
  SIDE_WINGER_CUTIN_MAX: 'Kanadın içe kesmesi',
  SIDE_DEF_DUTY_MAX: 'Kanadın savunma görevi',
  RUNBEHIND_COUNT: 'Arkaya koşan sayısı',
  HIGH_LINE_THIN_REST: 'Yüksek hat ve ince geri savunma',
  FULLBACKS_DYFWD_MIN: 'Beklerin ileri çıkışı',
  FALSE9_COUNT: 'False 9 sayısı',
  CROSS_VOLUME: 'Orta hacmi',
  CB_PACE_AVG: 'Stoper hızı',
  BUILDUP_SAFETY: 'Build-up pas güvenliği',
  AERIAL_TARGET_QUALITY: 'Hava hedefi kalitesi',
}

const OP_TEXT: Record<string, string> = { GTE: 'en az', GT: 'üzerinde', LTE: 'en çok', LT: 'altında', EQ: 'eşit' }

const num = (value: number): string => (Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100))

/** Analiz motorunun build-up adları (SHORT / BALANCED / COUNTER) → kullanıcı metni. */
const BUILD_UP_BY_ANALYSIS: Record<string, string> = { SHORT: 'kısa pas', BALANCED: 'dengeli', COUNTER: 'kontra' }
const BAND_TEXT = ['Derin hat', 'Dengeli hat', 'Yüksek hat', 'Agresif hat']
const band = (ordinal: number): string => BAND_TEXT[Math.max(0, Math.min(BAND_TEXT.length - 1, Math.round(ordinal)))]

interface EvidenceInput {
  metric: string
  params?: Record<string, unknown>
  value: number
  op: string
  threshold: number
  reference?: number | null
}

/** "Geri savunmada kalan oyuncu: 4 (eşik: altında 5)" biçiminde tek satır; iç sayı kodları (bant sırası, 0/1 bayrakları) okunur ifadeye çevrilir. */
export function evidenceText(e: EvidenceInput): string {
  if (e.metric === 'BUILDUP_IS') {
    return `Build-up: ${BUILD_UP_BY_ANALYSIS[String(e.params?.name)] ?? 'seçili'} seçili`
  }
  if (e.metric === 'BAND_ORDINAL') {
    return `Hat bandı: ${band(e.value)} (eşik: ${band(e.threshold)} ve üstü)`
  }
  if (e.metric === 'HIGH_LINE_THIN_REST') {
    return `Hat yüksek ve geri savunmada ${num(Number(e.params?.restBelow ?? 5) - 1)} ya da daha az oyuncu kalıyor`
  }
  const name = EVIDENCE_LABEL[e.metric] ?? 'Ölçüm'
  const reference = e.reference === null || e.reference === undefined ? '' : ` · seviye referansı ${num(e.reference)}`
  return `${name}: ${num(e.value)} (eşik: ${OP_TEXT[e.op] ?? e.op} ${num(e.threshold)}${reference})`
}
