import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { CareerPlayer, PlayerTagKind } from '../api/types'

const TAGS: { id: PlayerTagKind; label: string }[] = [
  { id: 'LOCKED', label: 'Dokunulmaz' },
  { id: 'ROTATION', label: 'Rotasyon' },
  { id: 'DEVELOPING', label: 'Gelişiyor' },
  { id: 'FOR_SALE', label: 'Satılık' },
  { id: 'LOAN_OK', label: 'Kiralanabilir' },
]

/** Oyuncu etiketleri (tek etiket/oyuncu) ve yaş × OVR dağılım haritası. */
export function SquadTagsView({ careerId, squad }: { careerId: number; squad: CareerPlayer[] }) {
  const client = useQueryClient()
  const tags = useQuery({ queryKey: ['tags', careerId], queryFn: () => endpoints.playerTags(careerId), retry: false })
  const tagOf = Object.fromEntries((tags.data ?? []).map((t) => [t.playerId, t.tag]))
  const toggle = useMutation({
    mutationFn: ({ playerId, tag }: { playerId: number; tag: PlayerTagKind }) =>
      tagOf[playerId] === tag ? endpoints.clearPlayerTag(careerId, playerId) : endpoints.setPlayerTag(careerId, playerId, tag),
    onSuccess: () => client.invalidateQueries({ queryKey: ['tags', careerId] }),
  })

  const aged = squad.filter((c) => c.player.age)
  const ovrs = squad.map((c) => c.player.overall)
  const lo = Math.min(...ovrs, 99) - 2
  const hi = Math.max(...ovrs, 1) + 2
  const x = (age: number) => 10 + ((Math.min(Math.max(age, 16), 40) - 16) / 24) * 280
  const y = (ovr: number) => 110 - ((ovr - lo) / Math.max(1, hi - lo)) * 100

  return (
    <div className="space-y-4">
      {aged.length > 0 && (
        <svg viewBox="0 0 300 125" className="h-48 w-full" role="img" aria-label="Yaş ve OVR dağılımı">
          <line x1="10" y1="110" x2="290" y2="110" stroke="currentColor" className="text-line" />
          {[20, 25, 30, 35].map((age) => <text key={age} x={x(age)} y="122" fontSize="7" textAnchor="middle" className="fill-current text-muted">{age}</text>)}
          {aged.map((c) => (
            <circle key={c.player.id} cx={x(c.player.age!)} cy={y(c.player.overall)} r="3.5" className={tagOf[c.player.id] === 'FOR_SALE' ? 'fill-current text-warn' : 'fill-current text-accent'} opacity="0.8">
              <title>{c.player.name} · {c.player.age} yaş · {c.player.overall}</title>
            </circle>
          ))}
        </svg>
      )}
      <ul className="divide-y divide-line text-sm">
        {[...squad].sort((a, b) => b.player.overall - a.player.overall).map((c) => (
          <li key={c.player.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <span><Link to={`/players/${c.player.id}`} className="font-semibold hover:underline">{c.player.name}</Link> <span className="num text-xs text-muted">{c.player.overall} · {c.player.positions[0]} · {c.player.age ?? '—'} yaş</span></span>
            <span className="flex flex-wrap gap-1">
              {TAGS.map((t) => (
                <button key={t.id} type="button" aria-pressed={tagOf[c.player.id] === t.id} disabled={toggle.isPending} onClick={() => toggle.mutate({ playerId: c.player.id, tag: t.id })}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagOf[c.player.id] === t.id ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-muted hover:text-ink'}`}>
                  {t.label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
