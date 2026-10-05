import { Link } from 'react-router-dom'
import type { CareerPlayer } from '../api/types'
import { unusedPositionSuggestions, type DepthState, type PositionNeed } from '../lib/depth'
import { groupByPrimaryPosition, primaryPosition } from '../lib/positions'
import { Button, Pill } from './ui'

const DEPTH_LABEL: Record<DepthState, { text: string; tone: 'rose' | 'emerald' | 'amber' }> = {
  thin: { text: 'İnce', tone: 'rose' },
  ok: { text: 'Dengeli', tone: 'emerald' },
  dense: { text: 'Yoğun', tone: 'amber' },
}

interface Props {
  squad: CareerPlayer[]
  busy: boolean
  onSell: (entry: CareerPlayer) => void
  onLoanOut: (entry: CareerPlayer) => void
  needs: PositionNeed[]
}

export function SquadCards({ squad, busy, onSell, onLoanOut, needs }: Props) {
  const groups = groupByPrimaryPosition(squad)
  const needByPosition = new Map(needs.map((n) => [n.position, n]))
  const suggestions = unusedPositionSuggestions(squad, needs)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Kadro derinliği özeti">
        {needs.map((n) => (
          <span key={n.position} title={n.reason} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800">
            <strong>{n.position}</strong> {n.natural.length}{n.flex.length > 0 ? `+${n.flex.length}` : ''} / {n.required}
            <Pill tone={DEPTH_LABEL[n.state].tone}>{DEPTH_LABEL[n.state].text}</Pill>
          </span>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g, index) => {
          const need = needByPosition.get(g.position)
          return (
            <section
              key={g.position}
              style={{ animationDelay: `${index * 40}ms` }}
              className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-600 dark:bg-slate-800"
            >
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {g.label} <span className="text-slate-400">· {g.players.length}</span>
                </h3>
                <span title={need?.reason}>
                  {need ? <Pill tone={DEPTH_LABEL[need.state].tone}>{DEPTH_LABEL[need.state].text}</Pill> : <Pill tone="slate">Taktikte yok</Pill>}
                </span>
              </header>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {g.players.map((entry) => (
                  <li key={entry.player.id} className="group flex items-center justify-between gap-2 py-1.5 text-sm">
                    <div className="min-w-0">
                      <Link to={`/players/${entry.player.id}`} className="block truncate font-medium hover:underline">
                        {entry.player.name}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {entry.player.age ? `${entry.player.age} yaş · ` : ''}
                        {entry.player.positions.slice(1, 3).join(', ')}
                        {entry.onLoan && ' · '}
                        {entry.onLoan && <Pill tone="amber">Kiralık</Pill>}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-right text-xs tabular-nums">
                        <strong className="text-base">{entry.player.overall}</strong>
                        <span className="text-slate-400"> / {entry.dynamicPotential ?? '—'}</span>
                      </span>
                      <span className="flex gap-0.5 opacity-60 transition group-hover:opacity-100">
                        <Button variant="ghost" disabled={busy} onClick={() => onSell(entry)}>
                          Sat
                        </Button>
                        <Button variant="ghost" disabled={busy} onClick={() => onLoanOut(entry)}>
                          Kiralık
                        </Button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-slate-800">
          <h3 className="mb-1 font-semibold">Mevki önerileri</h3>
          <ul className="space-y-0.5 text-xs">
            {suggestions.map(({ player, positions }) => (
              <li key={player.player.id}>
                <b>{player.player.name}</b> ({primaryPosition(player.player.positions)}){positions.length > 0 ? ` → ${positions.join(', ')} mevkisinde oynatılabilir (taktikte eksik)` : ' → bu taktikte asıl mevkisi yok; alternatif mevkilerine bak'}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">GEN / POT* (POT model tahminidir). Derinlik etiketleri seçili taktikten hesaplanır: ilk 11 slotları + yüksek tempolu rollerde rotasyon yedeği (asıl+alternatif / gereken).</p>
    </div>
  )
}
