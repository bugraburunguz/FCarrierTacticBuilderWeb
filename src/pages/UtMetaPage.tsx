import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { POSITIONS } from '../lib/format'

const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }

export function UtMetaPage() {
  const [position, setPosition] = useState('ST')
  const formations = useQuery({ queryKey: ['ut-formations'], queryFn: endpoints.utFormations, staleTime: 600_000 })
  const tier = useQuery({ queryKey: ['ut-tier', position], queryFn: () => endpoints.utTier(position, { limit: 25 }), staleTime: 300_000 })

  return (
    <div className="space-y-4">
      <Card title="Meta formasyonlar ve roller">
        {formations.isLoading ? (
          <Spinner />
        ) : formations.error ? (
          <ErrorBox error={formations.error} />
        ) : (
          <>
            <ul className="grid gap-2 sm:grid-cols-2">
              {formations.data?.formations.map((f) => (
                <li key={f.id} className="rounded-md border border-line p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <b>{f.id}</b>
                    {f.share && <Pill tone="emerald">~%{f.share}</Pill>}
                  </div>
                  <p className="text-muted">{f.note}</p>
                  <p className="mt-1 text-xs text-muted">Build-Up {f.buildUp} · hat yüksekliği ~{f.lineHeight}{f.keyRoles.length > 0 && ` · ${f.keyRoles.join(', ')}`}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{formations.data?.snapshotNote}</p>
          </>
        )}
      </Card>

      <Card title="Meta tier listesi">
        <div className="mb-3 max-w-xs">
          <Field label="Mevki">
            <Select value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>
        {tier.isLoading ? (
          <Spinner />
        ) : tier.error ? (
          <ErrorBox error={tier.error} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr><th className="py-1 pr-2">#</th><th className="pr-2">Kart</th><th className="pr-2 text-right">OVR</th><th className="pr-2 text-right">Meta*</th><th className="pr-2">Tier</th><th>En iyi chem style</th></tr>
              </thead>
              <tbody>
                {(tier.data ?? []).map((c, i) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-1.5 pr-2 text-muted">{i + 1}</td>
                    <td className="pr-2 font-medium"><Link to={`/players/${c.id}`} className="text-accent hover:underline">{c.name}</Link></td>
                    <td className="pr-2 text-right tabular-nums">{c.overall}</td>
                    <td className="pr-2 text-right font-semibold tabular-nums">{c.metaRating}</td>
                    <td className="pr-2"><Pill tone={TIER_TONE[c.tier] ?? 'slate'}>{c.tier}</Pill></td>
                    <td>{c.bestChemStyle ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Meta* platformun kendi tahmin metriğidir (EA rating'i değil): pace, PlayStyle+ ve mevkiye uygun statlar ağırlıklandırılır; chem style etkisi varsayımsal bir artışla simüle edilir. Şu an listedeki kartlar EA temel kartlarıdır; özel/promo kartlar ve fiyat verisi yoktur.
        </p>
      </Card>
    </div>
  )
}
