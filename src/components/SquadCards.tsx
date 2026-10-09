import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CareerPlayer, PlayerPositionAdvice } from '../api/types'
import { unusedPositionSuggestions, type DepthState, type PositionNeed } from '../lib/depth'
import { setCardDragImage } from '../lib/dragCard'
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
  positionAdvice: PlayerPositionAdvice[]
}

export function SquadCards({ squad, busy, onSell, onLoanOut, needs, positionAdvice }: Props) {
  const adviceById = new Map(positionAdvice.map((a) => [a.playerId, a]))
  const [dragged, setDragged] = useState<CareerPlayer | null>(null)
  const [hover, setHover] = useState<'SELL' | 'LOAN' | null>(null)
  const groups = groupByPrimaryPosition(squad)
  const needByPosition = new Map(needs.map((n) => [n.position, n]))
  const suggestions = unusedPositionSuggestions(squad, needs)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3" aria-label="Sürükle-bırak alanları">
        {([['SELL', 'Sat', onSell], ['LOAN', 'Kiralık gönder', onLoanOut]] as const).map(([zone, label, action]) => (
          <div
            key={zone}
            onDragOver={(e) => { e.preventDefault(); setHover(zone) }}
            onDragLeave={() => setHover(null)}
            onDrop={(e) => {
              e.preventDefault()
              setHover(null)
              if (dragged) {
                action(dragged)
              }
              setDragged(null)
            }}
            className={`rounded-md border-2 border-dashed p-3 text-center text-sm transition ${hover === zone ? 'border-accent bg-accent-soft' : 'border-line text-muted'} ${dragged ? 'animate-pulse' : ''}`}
          >
            {label} — oyuncu kartını buraya sürükle
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Kadro derinliği özeti">
        {needs.map((n) => (
          <span key={n.position} title={n.reason} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs">
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
              className="rounded-md border border-line bg-surface p-3 transition hover:"
            >
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {g.label} <span className="text-muted">· {g.players.length}</span>
                </h3>
                <span title={need?.reason}>
                  {need ? <Pill tone={DEPTH_LABEL[need.state].tone}>{DEPTH_LABEL[need.state].text}</Pill> : <Pill tone="slate">Taktikte yok</Pill>}
                </span>
              </header>
              <ul className="divide-y divide-line">
                {g.players.map((entry) => (
                  <li
                    key={entry.player.id}
                    draggable
                    onDragStart={(e) => {
                      setCardDragImage(e, { name: entry.player.name, overall: entry.player.overall, position: primaryPosition(entry.player.positions), detail: entry.player.age ? `${entry.player.age} yaş` : undefined })
                      setDragged(entry)
                    }}
                    onDragEnd={() => { setDragged(null); setHover(null) }}
                    className={`group flex cursor-grab items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm transition active:cursor-grabbing ${dragged?.player.id === entry.player.id ? 'scale-95 border border-dashed border-accent bg-accent-soft opacity-50' : 'hover:bg-surface-2'}`}>
                    <div className="min-w-0">
                      <Link to={`/players/${entry.player.id}`} className="block truncate font-medium hover:underline">
                        {entry.player.name}
                      </Link>
                      <span className="text-xs text-muted">
                        {entry.player.age ? `${entry.player.age} yaş · ` : ''}
                        {entry.player.positions.slice(1, 3).join(', ')}
                        {(entry.onLoan || entry.loanedOut) && ' · '}
                        {entry.onLoan && <Pill tone="amber">Kiralık (bizde)</Pill>}
                        {entry.loanedOut && <Pill tone="sky">Kiralıkta</Pill>}
                      </span>
                      <PositionHint advice={adviceById.get(entry.player.id)} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-right text-xs tabular-nums">
                        <strong className="text-base">{entry.player.overall}</strong>
                        <span className="text-muted"> / {entry.dynamicPotential ?? '—'}</span>
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
        <div className="rounded-md border border-line bg-code-soft p-3 text-sm">
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
      <p className="text-xs text-muted">GEN / POT* (POT model tahminidir). Derinlik etiketleri seçili taktikten hesaplanır: ilk 11 slotları + yüksek tempolu rollerde rotasyon yedeği (asıl+alternatif / gereken).</p>
    </div>
  )
}

function PositionHint({ advice }: { advice?: PlayerPositionAdvice }) {
  if (!advice || advice.best.length === 0) {
    return null
  }
  const top = advice.best[0]
  const tooltip = advice.best
    .map((b) => `${b.position} · ${b.roleName} · %${Math.round(b.score)}${b.natural ? '' : ' (listede yok)'}${b.reasons?.length ? ' — ' + b.reasons.join('; ') : ''}`)
    .join(String.fromCharCode(10))
  return (
    <span className="mt-0.5 block text-xs" title={tooltip}>
      {advice.bestOverallPosition && advice.bestOverall !== undefined && (
        <span className="mr-2 text-info">En yüksek overall: {advice.bestOverallPosition} {advice.bestOverall}</span>
      )}
      {advice.ownPositionBest ? (
        <span className="text-accent">
          <Check size={12} className="inline" aria-hidden="true" /> Kendi mevkisi iyi: {advice.listedPositions[0]} {top.natural ? `(%${Math.round(top.score)})` : ''}
        </span>
      ) : (
        <span className="text-code">
          → {top.position} ({top.roleName}) daha iyi: %{Math.round(top.score)}
        </span>
      )}
    </span>
  )
}
