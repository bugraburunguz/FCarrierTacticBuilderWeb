import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import { Card, ErrorBox, Field, Pill, Select, Spinner } from './ui'

const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }

export function ChemStylePanel({ playerId, positions }: { playerId: number; positions: string[] }) {
  const [position, setPosition] = useState(positions[0])
  const query = useQuery({
    queryKey: ['ut-chemstyle', playerId, position],
    queryFn: () => endpoints.utChemStyle(playerId, position),
    staleTime: 300_000,
  })
  const card = query.data
  const styles = [...(card?.chemStyles ?? [])].sort((a, b) => b.metaRating - a.metaRating)

  return (
    <Card title="UT meta rating ve chem style">
      <div className="mb-3 max-w-xs">
        <Field label="Mevki">
          <Select value={position} onChange={(e) => setPosition(e.target.value)}>
            {positions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </Field>
      </div>
      {query.isLoading ? (
        <Spinner />
      ) : query.error || !card ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <p className="mb-3 text-sm">
            Meta rating* <b className="text-lg tabular-nums">{card.metaRating}</b> <Pill tone={TIER_TONE[card.tier] ?? 'slate'}>{card.tier}</Pill>
            {card.bestChemStyle && <> · en iyi chem style: <b>{card.bestChemStyle}</b></>}
          </p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {styles.map((s) => (
              <li key={s.style} className={`rounded-xl border p-2.5 text-sm ${s.style === card.bestChemStyle ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <b>{s.style}</b>
                  <Pill tone={TIER_TONE[s.tier] ?? 'slate'}>{s.tier}</Pill>
                </div>
                <p className="tabular-nums">{s.metaRating} <span className="text-emerald-700 dark:text-emerald-400">(+{s.delta})</span></p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            *Platformun kendi tahmin metriğidir (EA rating'i değil). Chem style etkisi varsayımsal bir stat artışıyla simüle edilir; gerçek oyun değerleriyle ayarlanmamıştır.
          </p>
        </>
      )}
    </Card>
  )
}
