import { Link } from 'react-router-dom'
import type { CareerPlayer } from '../api/types'
import { DEPTH_GUIDE, depthState, groupByPrimaryPosition, type DepthState } from '../lib/positions'
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
}

export function SquadCards({ squad, busy, onSell, onLoanOut }: Props) {
  const groups = groupByPrimaryPosition(squad)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Kadro derinliği özeti">
        {groups.map((g) => {
          const state = depthState(g.position, g.players.length)
          return (
            <span key={g.position} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800">
              <strong>{g.position}</strong> {g.players.length}
              <Pill tone={DEPTH_LABEL[state].tone}>{DEPTH_LABEL[state].text}</Pill>
            </span>
          )
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g, index) => {
          const state = depthState(g.position, g.players.length)
          const guide = DEPTH_GUIDE[g.position]
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
                <span title={guide ? `Önerilen: ${guide[0]}–${guide[1]} oyuncu` : undefined}>
                  <Pill tone={DEPTH_LABEL[state].tone}>{DEPTH_LABEL[state].text}</Pill>
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
      <p className="text-xs text-slate-500">GEN / POT* (POT model tahminidir). Derinlik etiketleri genel bir rehberdir; kadro büyüklüğüne göre değişebilir.</p>
    </div>
  )
}
