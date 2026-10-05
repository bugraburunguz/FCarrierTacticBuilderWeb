import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { PlayerSummary } from '../api/types'
import { FitResultCard } from '../components/FitResultCard'
import { RolePicker, type RoleSelection } from '../components/RolePicker'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input } from '../components/ui'

const MAX_PLAYERS = 6

export function ComparePage() {
  const [selection, setSelection] = useState<RoleSelection>({ position: 'ST', roleId: 'advanced_forward_attack', tags: [] })
  const [chosen, setChosen] = useState<PlayerSummary[]>([])
  const [term, setTerm] = useState('')
  const search = useQuery({
    queryKey: ['compare-search', term],
    queryFn: () => endpoints.players({ q: term, size: 6 }),
    enabled: term.trim().length >= 2,
  })
  const compare = useMutation({
    mutationFn: () => endpoints.compare({ ids: chosen.map((c) => c.id), roleId: selection.roleId, position: selection.position, tags: selection.tags }),
  })
  const names = new Map(chosen.map((c) => [c.id, c.name]))

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card title="Rol">
          <RolePicker value={selection} onChange={setSelection} />
        </Card>
        <Card title={`Oyuncular (${chosen.length}/${MAX_PLAYERS})`}>
          <Field label="Oyuncu ekle">
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="En az 2 harf…" />
          </Field>
          <ul className="mt-2 space-y-1 text-sm">
            {(search.data?.items ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>
                  {p.name} <span className="text-slate-500">({p.overall} · {p.positions[0]})</span>
                </span>
                <Button variant="secondary" disabled={chosen.length >= MAX_PLAYERS || chosen.some((c) => c.id === p.id)} onClick={() => setChosen([...chosen, p])}>
                  Ekle
                </Button>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
            {chosen.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <Link to={`/players/${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
                <button type="button" aria-label={`${p.name} çıkar`} className="text-slate-400 hover:text-rose-600" onClick={() => setChosen(chosen.filter((c) => c.id !== p.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <Button className="mt-3 w-full" disabled={chosen.length === 0 || !selection.roleId || compare.isPending} onClick={() => compare.mutate()}>
            Karşılaştır
          </Button>
        </Card>
      </div>

      <div className="space-y-3">
        <ErrorBox error={compare.error} />
        {!compare.data ? (
          <EmptyState>Bir rol seç, oyuncu ekle ve karşılaştır. En uygun oyuncu en üstte çıkar.</EmptyState>
        ) : (
          compare.data.map((result, index) => (
            <Card
              key={result.roleFit.playerId}
              title={
                <span>
                  {index + 1}. {names.get(result.roleFit.playerId) ?? result.roleFit.playerName} <BadgeDot state={result.roleFit.badge} />
                </span>
              }
            >
              <FitResultCard result={result} compact={index > 0} />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
