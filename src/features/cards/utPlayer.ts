import type { KbItem, PlayerRoleFit, PlayerSummary } from '../../api/types'

export interface CardVersion {
  /** URL `?v=` değeri: kartın resourceId'si (base kartta assetId). */
  key: string
  label: string
  rating: number
  base: boolean
  promo?: string
  cardType?: string
  /** `ut_item` kimliği (fiyat ucu için); katalog base kartında bilgi tabanı satırı yoksa yok. */
  itemId?: number
}

/** UT oyuncu bağlantısı: EA oyuncu kimliği (assetId); yoksa eski kimlik rotası. */
export function utPlayerHref(p: Pick<PlayerSummary, 'id' | 'faceAssetId'>): string {
  return p.faceAssetId ? `/ut/players/${p.faceAssetId}` : `/players/${p.id}`
}

/**
 * Versiyon şeridi yalnız mevcut veriyle: ilk kart her zaman katalogdaki base kart; bilgi tabanında (`ut_item`) bu oyuncunun başka kartı varsa rating azalan eklenir.
 * Uydurma versiyon yok: bilgi tabanı boşsa şeritte yalnız base görünür.
 */
export function buildVersions(summary: PlayerSummary, items: KbItem[]): CardVersion[] {
  const assetId = summary.faceAssetId
  const mine = items.filter((i) => assetId !== undefined && i.eaAssetId === assetId)
  const baseItem = mine.find((i) => i.eaResourceId === assetId)
  const base: CardVersion = { key: String(assetId ?? summary.id), label: `Base ${summary.overall}`, rating: summary.overall, base: true, itemId: baseItem?.id }
  const others = mine
    .filter((i) => i.eaResourceId !== assetId)
    .sort((a, b) => b.rating - a.rating)
    .map<CardVersion>((i) => ({ key: String(i.eaResourceId), label: `${i.promo ?? i.cardType} ${i.rating}`, rating: i.rating, base: false, promo: i.promo, cardType: i.cardType, itemId: i.id }))
  return [base, ...others]
}

export function pickVersion(versions: CardVersion[], v: string | null): CardVersion {
  return versions.find((x) => x.key === v) ?? versions[0]
}

/** Roller: seviyesine göre uyum (levelFit) azalan; yoksa rol puanı (currentFit / score). */
export function sortRoles(roles: PlayerRoleFit[]): PlayerRoleFit[] {
  const key = (r: PlayerRoleFit) => r.levelFit ?? r.currentFit ?? r.score
  return [...roles].sort((a, b) => key(b) - key(a))
}
