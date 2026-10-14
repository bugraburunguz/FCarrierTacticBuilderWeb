import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { PlayerDetail, PlayerRoleFit } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { FitNarrativeView } from '../../components/FitNarrativeView'
import { Button, Chip, EmptyState, ErrorState, Segmented, Skeleton, StatTile } from '../../design/components/primitives'
import { HelpPopover } from '../../components/ui'
import { fitDisplay, ROLES_HELP, rolePointsText, TAILORED_TEXT } from '../../lib/fitLabels'
import { ATTR_GROUPS, ATTR_LABELS } from '../../lib/format'
import { playStyleName } from '../../lib/playstyles'
import { TONE_VAR, ratingTone } from '../../lib/ratingTone'
import { formatPrice } from './formatPrice'
import { sortRoles, type CardVersion } from './utPlayer'

const STALE_MS = 120_000
const ROLES_SHOWN = 5

/** Statlar: 6 grup attribute tablosu (ratingTone ile renkli), PlayStyle'lar; kaleci için yalnız kaleci grubu. Değerler katalog (base) kartına aittir. */
export function StatsTab({ detail, version }: { detail: PlayerDetail; version: CardVersion }) {
  const { attrs, playstyles, summary } = detail
  const goalkeeper = summary.positions.includes('GK')
  const groups = ATTR_GROUPS.filter((g) => (g.title === 'Kaleci') === goalkeeper || (g.title !== 'Kaleci' && !goalkeeper))
  return (
    <div className="flex flex-col gap-4">
      {!version.base && <p className="text-xs text-muted">Bu sayfa katalogdaki base kartın değerlerini gösterir; {version.label} kartının attribute farkları henüz kayıtlı değil.</p>}
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="mb-1 font-display text-lg font-semibold leading-6">{g.title}</h2>
          <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {g.attrs.map((a) => {
              const value = attrs[a] ?? 0
              return (
                <div key={a} className="flex items-center gap-2 border-b border-[var(--glass-border)] py-1 text-sm">
                  <dt className="w-32 shrink-0 break-words leading-tight text-ink-2">{ATTR_LABELS[a] ?? a}</dt>
                  <dd className="flex min-w-0 flex-1 items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--glass-3)]"><span className="block h-full rounded-full" style={{ width: `${value}%`, background: TONE_VAR[ratingTone(value)] }} /></span>
                    <span className="min-w-7 text-right font-[var(--font-num)] font-medium tabular-nums text-ink">{value}</span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
      {Object.keys(playstyles).length > 0 && (
        <section aria-label="PlayStyle">
          <h2 className="mb-1 font-display text-lg font-semibold leading-6">PlayStyle</h2>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(playstyles).map(([ps, level]) => (
              <Chip key={ps} tone={level >= 2 ? 'warn' : undefined}>{playStyleName(ps, level)}</Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Yüzde yalnız rozette (seviyesine göre); rol puanı ayrı sayıdır ve yalnız seviye değeri varken yazılır (yoksa rozetteki sayı odur). */
function RoleRow({ role, tailored }: { role: PlayerRoleFit; tailored: boolean }) {
  const d = fitDisplay({ levelFit: role.levelFit, currentFit: role.currentFit, score: role.score, fitLabel: role.fitLabel ?? null, badge: role.badge })
  return (
    <li className="glass-3 flex flex-col gap-1 p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={role.roleName}>{role.roleName}</span>
        {tailored && <Chip tone="good">{TAILORED_TEXT}</Chip>}
        <FitBadge state={d.state} pct={d.pct} />
        {role.levelFit !== undefined && role.levelFit !== null && <span className="text-xs text-muted">{rolePointsText(d.rolePoints)}</span>}
      </div>
      {role.narrative && (
        <details className="text-xs">
          <summary className="min-h-8 cursor-pointer font-semibold text-accent max-sm:min-h-11">Neden?</summary>
          <FitNarrativeView narrative={role.narrative} showTailored={false} />
        </details>
      )}
    </li>
  )
}

/**
 * Roller: v3 uyum (rozet = seviyesine göre %, yanında rol puanı), mevki başına en uygun roller; "Neden?" altında anlatım.
 * "Biçilmiş kaftan" mevki başına yalnız en iyi role, sunucu `tailored` derse. Sözlük `fitLabels` (tek kaynak).
 */
export function RolesTab({ playerId, positions }: { playerId: number; positions: string[] }) {
  const query = useQuery({ queryKey: ['player-roles-v3', playerId], queryFn: () => endpoints.playerRoles(playerId, undefined, 'v3'), staleTime: STALE_MS })
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (query.isLoading) {
    return <div aria-busy="true" aria-label="Yükleniyor" className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
  }
  if (query.isError || !query.data) {
    return <ErrorState message="Roller yüklenemedi." onRetry={() => query.refetch()} />
  }
  const byPosition = new Map<string, PlayerRoleFit[]>()
  query.data.forEach((r) => byPosition.set(r.position, [...(byPosition.get(r.position) ?? []), r]))
  const shownPositions = positions.filter((p) => byPosition.has(p))
  if (shownPositions.length === 0) {
    return <EmptyState>Bu oyuncu için rol bulunamadı.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        Uygunluk nasıl okunur?
        <HelpPopover label="Rozet ve rol puanı">
          <p>{ROLES_HELP.badge}</p>
          <p className="mt-1">{ROLES_HELP.rolePoints}</p>
        </HelpPopover>
      </div>
      {shownPositions.map((position, index) => {
        const roles = sortRoles(byPosition.get(position) ?? [])
        const all = open[position]
        return (
          <section key={position} aria-label={`${position} rolleri`} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold leading-6">
              {position}
              {index === 0 && <Chip>Ana mevki</Chip>}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {(all ? roles : roles.slice(0, ROLES_SHOWN)).map((r, i) => (
                <RoleRow key={r.roleId} role={r} tailored={i === 0 && r.narrative?.tailored === true} />
              ))}
            </ul>
            {roles.length > ROLES_SHOWN && (
              <div><Button variant="ghost" onClick={() => setOpen((cur) => ({ ...cur, [position]: !all }))}>{all ? 'Daha az göster' : `Tüm roller (${roles.length})`}</Button></div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Fiyat: yalnız bilgi tabanında (`ut_item`) kaydı olan kart için; veri yoksa dürüst boş durum. */
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
