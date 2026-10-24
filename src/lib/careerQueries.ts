import type { Query, QueryClient } from '@tanstack/react-query'

/**
 * Kariyere bağlı önbellek kapsamı (REVIEW Y2/Y3/O4). Sorgu anahtarlarının biçimi sayfadan sayfaya farklı (['squad', id],
 * ['slot-fit','lineup',id,…], ['career-player', id, oyuncu], ['wonderkids', {career: id}]); anahtarın herhangi bir yerinde kariyer
 * kimliği geçen sorgu kapsamdadır. Fazladan tazeleme zararsızdır (yeniden çekilir), eksik tazeleme bayat veri bırakır.
 */
const mentions = (part: unknown, careerId: number): boolean => {
  if (part === careerId || part === String(careerId)) {
    return true
  }
  if (part && typeof part === 'object') {
    return Object.values(part as Record<string, unknown>).some((v) => mentions(v, careerId))
  }
  return false
}

const inScope = (careerId: number) => (query: Query) => query.queryKey[0] === 'careers' || query.queryKey.slice(1).some((part) => mentions(part, careerId))

/** İçe aktarma, kadro hareketi/geri alma, ayar kaydı, yedekten dönüş sonrası: kariyere bağlı her şey ve kariyer listesi tazelenir. */
export function invalidateCareerScope(client: QueryClient, careerId: number): Promise<void> {
  return client.invalidateQueries({ predicate: inScope(careerId) })
}

/** Kariyer silinince: o kariyerin sorguları önbellekten kalkar (silinmiş kimlikle yeniden istek atılmaz); liste tazelenir. */
export function removeCareerScope(client: QueryClient, careerId: number): void {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'careers' && inScope(careerId)(query) })
  void client.invalidateQueries({ queryKey: ['careers'] })
}
