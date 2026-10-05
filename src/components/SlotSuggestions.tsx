import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { Card, ErrorBox, Pill, Spinner } from './ui'
import { BadgeDot } from './ui'
import { CompareButton } from './CompareButton'

interface Props {
  roleId?: string
  position: string
  tags: string[]
  gender?: number
}

export function SlotSuggestions({ roleId, position, tags, gender }: Props) {
  const suggestions = useQuery({
    queryKey: ['slot-preview', roleId, position, tags.join(','), gender],
    queryFn: () => endpoints.previewSlot({ roleId: roleId!, position, tags, gender, limit: 6 }),
    enabled: roleId !== undefined,
    staleTime: 60_000,
    retry: false,
  })

  return (
    <Card title="Bu slota en uygun oyuncular" actions={<Pill tone="emerald">Ücretsiz önizleme</Pill>}>
      {suggestions.isLoading ? (
        <Spinner />
      ) : suggestions.error ? (
        <ErrorBox error={suggestions.error} />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {(suggestions.data?.items ?? []).map((item) =>
            item.player ? (
              <li key={item.player.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <BadgeDot state={item.roleFit.badge} />{' '}
                  <Link to={`/players/${item.player.id}`} className="font-medium hover:underline">
                    {item.player.name}
                  </Link>{' '}
                  <span className="text-xs text-slate-500">
                    {item.player.positions[0]} · {item.player.overall}
                    {item.player.club ? ` · ${item.player.club}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">%{Math.round(item.combined)}</span>
                  <CompareButton compact entry={{ id: item.player.id, name: item.player.name, overall: item.player.overall, position: item.player.positions[0] ?? '' }} />
                </span>
              </li>
            ) : null,
          )}
          {(suggestions.data?.items ?? []).length === 0 && <li className="text-slate-500">Bu rol için uygun oyuncu bulunamadı.</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">Tüm kataloğun en uygun adayları. Kadronu ve bütçeni hesaba katan öneri için aşağıdan kadro analizini çalıştır.</p>
    </Card>
  )
}
