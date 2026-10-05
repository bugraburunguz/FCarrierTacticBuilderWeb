import type { ScoutQuery } from '../api/types'

/** ScoutQuery -> /players filtre bağlantısı (attribute anahtarı küçük harf, alt çizgisiz). */
export function scoutLink(query: ScoutQuery | undefined): string {
  if (!query) {
    return '/players'
  }
  const params = new URLSearchParams()
  query.positions.forEach((p) => params.append('pos', p))
  Object.entries(query.minAttrs).forEach(([attr, min]) => params.set(`${attr.toLowerCase()}_min`, String(min)))
  params.set('sort', 'overall')
  params.set('order', 'asc')
  return `/players?${params.toString()}`
}
