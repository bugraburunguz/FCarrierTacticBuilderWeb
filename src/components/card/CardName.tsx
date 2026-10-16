import { displayName, useAssetName } from '../../lib/assetNames'

/**
 * V3-05d-c: kulüp kartının metin olarak adı (listeler, tablolar). PlayerCard ile aynı kural: katalog adı (assetId) → yakalanan gerçek ad →
 * "ST 84" (title "Ad bilinmiyor").
 */
export function CardName({ assetId, name, position, rating, className }: { assetId?: number; name: string; position?: string; rating: number; className?: string }) {
  const shown = displayName(useAssetName(assetId), name, position, rating)
  return <span className={className} title={shown.title}>{shown.full ?? shown.strip}</span>
}
