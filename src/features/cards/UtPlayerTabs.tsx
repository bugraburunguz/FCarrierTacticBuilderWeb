import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { EmptyState, ErrorState, Segmented, Skeleton, StatTile } from '../../design/components/primitives'
import { formatPrice } from './formatPrice'
import type { CardVersion } from './utPlayer'

const STALE_MS = 120_000

/** Fiyat: yalnız bilgi tabanında (`ut_item`) kaydı olan kart için; veri yoksa dürüst boş durum. Statlar ve Roller `features/player`'da (ortak). */
export function PriceTab({ version }: { version: CardVersion }) {
  const [platform, setPlatform] = useState<'CONSOLE' | 'PC'>('CONSOLE')
  const itemId = version.itemId
  const query = useQuery({ queryKey: ['kb-prices', itemId, platform], queryFn: () => endpoints.kbPrices(itemId!, platform, '7d'), enabled: itemId !== undefined, staleTime: STALE_MS, retry: false })
  if (itemId === undefined) {
    return <EmptyState>Bu kart için fiyat kaydı yok: kart henüz bilgi tabanına girmemiş. Fiyatlar kulüp/market yakalamalarıyla gelir.</EmptyState>
  }
  if (query.isLoading) {
    return <Skeleton className="h-32" />
  }
  if (query.isError) {
    return <ErrorState message="Fiyatlar yüklenemedi." onRetry={() => query.refetch()} />
  }
  const points = query.data ?? []
  const last = points[points.length - 1]
  return (
    <div className="flex flex-col gap-3">
      <Segmented label="Platform" value={platform} options={[{ id: 'CONSOLE', label: 'Konsol' }, { id: 'PC', label: 'PC' }]} onChange={setPlatform} />
      {points.length === 0 || !last ? (
        <EmptyState>Son 7 günde bu platformda fiyat verisi yok.</EmptyState>
      ) : (
        <>
          <div className="flex gap-2">
            <StatTile label="Ortanca" value={formatPrice(last.p50)} />
            <StatTile label="En düşük satın alma" value={formatPrice(last.minBin)} />
          </div>
          {last.lowConfidence && <p className="text-xs text-muted">Az örnek ({last.samples}): değer güvenilir değil.</p>}
          <table className="w-full text-sm">
            <caption className="sr-only">Son 7 gün fiyat noktaları</caption>
            <thead className="text-xs text-muted"><tr><th scope="col" className="py-1 text-left font-medium">Zaman</th><th scope="col" className="py-1 text-right font-medium">Ortanca</th><th scope="col" className="py-1 text-right font-medium">Örnek</th></tr></thead>
            <tbody>
              {points.slice(-8).map((p) => (
                <tr key={p.bucket} className="border-t border-[var(--glass-border)]"><td className="py-1">{new Date(p.bucket).toLocaleString('tr-TR')}</td><td className="py-1 text-right font-[var(--font-num)] tabular-nums">{formatPrice(p.p50)}</td><td className="py-1 text-right font-[var(--font-num)] tabular-nums text-muted">{p.samples}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

/** Nasıl alınır: paket / SBC / objective eşlemesi için veri kaynağı henüz yok (CARD-05/06); uydurma yok. */
export function AcquireTab({ version }: { version: CardVersion }) {
  return (
    <div className="flex flex-col gap-2">
      {version.promo && <p className="text-sm">Promo: <b>{version.promo}</b></p>}
      <EmptyState>Bu kartın nasıl alınacağına dair kayıt yok: SBC, objective ve paket eşlemesi henüz bilgi tabanında bulunmuyor.</EmptyState>
    </div>
  )
}
