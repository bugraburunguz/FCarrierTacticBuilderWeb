import type { ReplicaBuildUp, ReplicaCategory, ReplicaSummary } from '../../api/types'
import { BUILD_UP_LABEL, CATEGORY_ORDER } from './labels'

export interface ReplicaFilters {
  category: ReplicaCategory | 'ALL'
  formation: string
  buildUp: ReplicaBuildUp | 'ALL'
  /** Dönem: sezonun başlangıç yılı aralığı (uçlar dahil). */
  from?: number
  to?: number
  query: string
}

export const DEFAULT_FILTERS: ReplicaFilters = { category: 'ALL', formation: '', buildUp: 'ALL', query: '' }

/** "1999-00" → 1999; sezon biçimi tanınmazsa undefined. */
export function startYear(season: string): number | undefined {
  const match = /^(\d{4})/.exec(season)
  return match ? Number(match[1]) : undefined
}

/** Türkçe/aksanlı harfler ve büyük-küçük harf farkı olmadan karşılaştırma. */
export function normalizeText(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o')
    .replace(/ł/g, 'l')
}

export function filterReplicas(list: ReplicaSummary[], f: ReplicaFilters): ReplicaSummary[] {
  const query = normalizeText(f.query.trim())
  return list.filter((r) => {
    if (f.category !== 'ALL' && r.category !== f.category) {
      return false
    }
    if (f.formation !== '' && r.eaFormation !== f.formation) {
      return false
    }
    if (f.buildUp !== 'ALL' && r.buildUp !== f.buildUp) {
      return false
    }
    const year = startYear(r.season)
    if ((f.from !== undefined && (year === undefined || year < f.from)) || (f.to !== undefined && (year === undefined || year > f.to))) {
      return false
    }
    return query === '' || normalizeText(`${r.club} ${r.coach} ${r.season}`).includes(query)
  })
}

/** Yeniden eskiye; eşitte kulüp adı. */
export function sortReplicas(list: ReplicaSummary[]): ReplicaSummary[] {
  return [...list].sort((a, b) => (startYear(b.season) ?? 0) - (startYear(a.season) ?? 0) || a.club.localeCompare(b.club, 'tr'))
}

const KEYS = { category: 'kategori', formation: 'formasyon', buildUp: 'build', from: 'dan', to: 'a', query: 'ara' } as const

/** Süzgeçler adres çubuğunda durur (paylaşılabilir "filtreli liste"). */
export function filtersToParams(f: ReplicaFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.category !== 'ALL') {
    params.set(KEYS.category, f.category)
  }
  if (f.formation !== '') {
    params.set(KEYS.formation, f.formation)
  }
  if (f.buildUp !== 'ALL') {
    params.set(KEYS.buildUp, f.buildUp)
  }
  if (f.from !== undefined) {
    params.set(KEYS.from, String(f.from))
  }
  if (f.to !== undefined) {
    params.set(KEYS.to, String(f.to))
  }
  if (f.query !== '') {
    params.set(KEYS.query, f.query)
  }
  return params
}

const year = (value: string | null): number | undefined => (value !== null && /^\d{4}$/.test(value) ? Number(value) : undefined)

export function filtersFromParams(params: URLSearchParams): ReplicaFilters {
  const category = params.get(KEYS.category)
  const buildUp = params.get(KEYS.buildUp)
  return {
    category: CATEGORY_ORDER.includes(category as ReplicaCategory) ? (category as ReplicaCategory) : 'ALL',
    formation: params.get(KEYS.formation) ?? '',
    buildUp: buildUp !== null && buildUp in BUILD_UP_LABEL ? (buildUp as ReplicaBuildUp) : 'ALL',
    from: year(params.get(KEYS.from)),
    to: year(params.get(KEYS.to)),
    query: params.get(KEYS.query) ?? '',
  }
}
