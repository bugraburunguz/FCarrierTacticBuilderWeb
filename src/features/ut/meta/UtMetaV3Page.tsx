import { Link } from 'react-router-dom'
import { HelpPopover } from '../../../components/ui'
import { PageHeader } from '../../../design/components/PageHeader'
import { Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../../design/components/primitives'
import { POSITIONS } from '../../../lib/format'
import { usePageParams } from '../../player/playerPage'
import { useUtMeta } from './useUtMeta'

const TIER_TONE: Record<string, 'good' | 'info' | 'warn' | undefined> = { 'A+': 'good', A: 'info', B: 'warn' }
const NUM = 'font-[var(--font-num)] tabular-nums'

/**
 * v3 UT Meta (/ut/meta, V3-07c; 11 §9 Pano + Katalog tablosu): üstte meta formasyon kartları (seed), altta mevki çipleriyle tier tablosu.
 * Mevki adreste (?mevki=, varsayılan ST). Meta* platformun tahmini; açıklama HelpPopover'da.
 */
export function UtMetaV3Page() {
  const { params, set } = usePageParams()
  const position = POSITIONS.includes(params.get('mevki') ?? '') ? params.get('mevki')! : 'ST'
  const { formations, tier } = useUtMeta(position)
  const rows = tier.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2">
      <PageHeader title="Meta" subtitle="Topluluğun öne çıkan dizilişleri ve mevki başına en iyi kartlar." />

      <Panel title="Meta formasyonlar">
        {formations.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : formations.isError ? (
          <ErrorState message="Meta formasyonlar yüklenemedi." onRetry={() => formations.refetch()} />
        ) : (formations.data?.formations ?? []).length === 0 ? (
          <EmptyState>Henüz meta formasyon verisi yok.</EmptyState>
        ) : (
          <>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {formations.data!.formations.map((f) => (
                <li key={f.id} className="glass-3 flex flex-col gap-1 rounded-[var(--radius-sm)] p-3 text-sm">
                  <span className="flex items-center justify-between gap-2">
                    <b className={`${NUM} text-base`}>{f.id}</b>
                    {f.share !== undefined && <Chip tone="good">~%{f.share}</Chip>}
                  </span>
                  <span className="text-ink-2">{f.note}</span>
                  <span className="text-xs text-ink-2">Build-Up {f.buildUp} · hat ~{f.lineHeight}{f.keyRoles.length > 0 ? ` · ${f.keyRoles.join(', ')}` : ''}</span>
                </li>
              ))}
            </ul>
            {formations.data!.snapshotNote && <p className="mt-2 text-xs text-ink-2">{formations.data!.snapshotNote}</p>}
          </>
        )}
      </Panel>

      <Panel title={<span className="flex items-center gap-1.5">Tier listesi · {position}<HelpPopover label="Meta nedir">Meta* platformun kendi tahmin metriğidir (EA rating'i değil): pace, PlayStyle+ ve mevkiye uygun statlar ağırlıklandırılır; chem style etkisi varsayımsal bir artışla simüle edilir. Listedeki kartlar EA temel kartlarıdır; özel/promo kartlar ve fiyat yoktur.</HelpPopover></span>}>
        <div role="group" aria-label="Mevki" className="mb-3 flex gap-1.5 max-[819px]:-mx-1 max-[819px]:overflow-x-auto max-[819px]:px-1 max-[819px]:pb-1 min-[820px]:flex-wrap">
          {POSITIONS.map((p) => <Chip key={p} pressed={p === position} onClick={() => set({ mevki: p === 'ST' ? undefined : p })}>{p}</Chip>)}
        </div>
        {tier.isLoading ? (
          <div className="flex flex-col gap-1.5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : tier.isError ? (
          <ErrorState message="Tier listesi yüklenemedi." onRetry={() => tier.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState>Bu mevkide meta kartı yok. Başka bir mevki seç.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Meta tier listesi" className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs font-medium text-ink-2">
                <tr>
                  <th scope="col" className="py-1.5 pr-2">#</th>
                  <th scope="col" className="pr-2">Kart</th>
                  <th scope="col" className="pr-2 text-right">OVR</th>
                  <th scope="col" className="pr-2 text-right">Meta*</th>
                  <th scope="col" className="pr-2">Tier</th>
                  <th scope="col">En iyi chem style</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id} className="border-t border-[var(--glass-border)]">
                    <td className={`py-2 pr-2 text-ink-2 ${NUM}`}>{i + 1}</td>
                    <td className="pr-2 font-medium"><Link to={`/players/${c.id}`} className="hover:underline">{c.name}</Link></td>
                    <td className={`pr-2 text-right ${NUM}`}>{c.overall}</td>
                    <td className={`pr-2 text-right font-semibold ${NUM}`}>{c.metaRating}</td>
                    <td className="pr-2"><Chip tone={TIER_TONE[c.tier]}>{c.tier}</Chip></td>
                    <td className="text-ink-2">{c.bestChemStyle ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
