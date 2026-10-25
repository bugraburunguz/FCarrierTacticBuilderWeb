import type { Query, QueryClient } from '@tanstack/react-query'

/**
 * Kariyere bağlı önbellek kapsamı (REVIEW Y2/Y3/O4). Sorgu anahtarlarının biçimi sayfadan sayfaya farklı (['squad', id],
 * ['slot-fit','lineup',id,…], ['player', oyuncu, id], ['wonderkids', filtre, id]); kariyer kimliği her önek için bilinen konumda aranır.
 * Herhangi bir konumdaki sayıyı saymak ilgisiz önbellekleri de vuruyordu (['leagues', cinsiyet], ['ut-player', asset], filtre değerleri).
 * Yeni kariyer kapsamlı anahtar eklerken buraya da ekle.
 */
const CAREER_AT_1 = new Set([
  'squad', 'events', 'career-moves', 'career-player', 'career-player-contract', 'career-players', 'career-team', 'career-teams', 'lineup',
  'player-facets', 'position-advice', 'shortlist', 'tags', 'user-tactics', 'main-tactic', 'starter-tactic', 'snapshots', 'snapshot-diff', 'history',
  'development-recommendations', 'setup-check', 'tactic-analysis', 'academy', 'youth', 'youth-detail',
])
const CAREER_AT_2 = new Set(['player', 'player-roles', 'player-roles-v3', 'player-development', 'wonderkids'])
/** `slot-fit` alt türlerinden kariyerli olanlar (`v3` oyuncu kimliği taşır, kariyersiz). */
const CAREER_SLOT_FIT = new Set(['lineup', 'compare', 'replica'])

const careerPart = (key: readonly unknown[]): unknown => {
  const head = key[0] as string
  if (CAREER_AT_1.has(head)) {
    return key[1]
  }
  if (CAREER_AT_2.has(head) || (head === 'slot-fit' && CAREER_SLOT_FIT.has(key[1] as string))) {
    return key[2]
  }
  return undefined
}

const inScope = (careerId: number) => (query: Query) => {
  const part = careerPart(query.queryKey)
  return query.queryKey[0] === 'careers' || part === careerId || part === String(careerId)
}

/** İçe aktarma, kadro hareketi/geri alma, ayar kaydı, yedekten dönüş sonrası: kariyere bağlı her şey ve kariyer listesi tazelenir. */
export function invalidateCareerScope(client: QueryClient, careerId: number): Promise<void> {
  return client.invalidateQueries({ predicate: inScope(careerId) })
}

/** Kariyer silinince: o kariyerin sorguları önbellekten kalkar (silinmiş kimlikle yeniden istek atılmaz); liste tazelenir. */
export function removeCareerScope(client: QueryClient, careerId: number): void {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'careers' && inScope(careerId)(query) })
  void client.invalidateQueries({ queryKey: ['careers'] })
}
