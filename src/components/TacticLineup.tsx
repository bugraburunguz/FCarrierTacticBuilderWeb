import { Link } from 'react-router-dom'
import type { CareerPlayer, Formation } from '../api/types'
import { shortRole, useCareerLineup } from '../features/squad/kadro/useCareerLineup'
import { fitDisplay } from '../lib/fitLabels'
import { Pitch } from './squadBuilder/Pitch'
import { BadgeDot, Button, Card, ErrorBox, Pill, Spinner } from './ui'

interface Props {
  careerId: number
  squad: CareerPlayer[]
  formations: Formation[]
}

/** v2 ilk 11 kartı (v3: features/squad/kadro/KadroPage). Mantık useCareerLineup'ta. */
export function TacticLineup({ careerId, squad, formations }: Props) {
  const { tactic, formation, enough, lineup, fit, bench, views, openBuilder, swap, saveMirrored } = useCareerLineup(careerId, squad, formations)

  if (!enough) {
    return (
      <Card title="Seçili taktikte kadro">
        <p className="text-sm text-muted">İlk 11’i dizebilmek için kadroda en az 11 oyuncu olmalı.</p>
      </Card>
    )
  }
  return (
    <Card
      title={`Seçili taktikte kadro · ${tactic.formation}${tactic.presetId ? ` · ${tactic.presetId}` : ''}`}
      actions={
        <div className="flex gap-3 text-sm">
          <Link to="/squad/builder" className="text-accent underline">
            Kadro kurucuda düzenle
          </Link>
        </div>
      }
    >
      {lineup.isLoading && <Spinner />}
      <ErrorBox error={lineup.error} />
      {fit && formation && (
        <div className="space-y-3">
          {fit.mirrored && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-code-soft p-2 text-sm text-code">
              <span>
                <Pill tone="amber">Aynalandı</Pill> Kadronda bu görevlere sağ-sol ters daha uygun oyuncular var; taktik otomatik aynalandı (ör. sağ kanat görevi sola geçti).
              </span>
              <Button variant="secondary" onClick={saveMirrored}>
                Aynalanmış taktiği kaydet
              </Button>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(300px,440px)_1fr]">
            <div className="rounded-md border border-line bg-surface p-2.5">
              <Pitch
                slots={views}
                onPickPlayer={openBuilder}
                onPickRole={openBuilder}
                onSwap={swap}
              />
              <p className="mt-2 px-1 text-xs text-muted">Oyuncuyu başka karta sürüklersen değişiklik Kadro kurucuda kaydedilir.</p>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted">İlk 11 ve yedekleri</h4>
                <ul className="space-y-1 text-sm">
                  {fit.slots.map((s) => (
                    <li key={s.slotId} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong className="inline-block w-12">{s.slotId}</strong>
                        {s.roleFit && <BadgeDot state={s.roleFit.badge} />} {s.playerName ?? '—'}{' '}
                        <span className="text-xs text-muted">
                          {shortRole(s.roleName)} · %{s.roleFit ? fitDisplay(s.roleFit).pct : 0}
                        </span>
                      </span>
                      <span className="text-xs text-muted">
                        {s.depth === undefined ? '' : s.depth.length > 0 ? `yedek: ${s.depth.map((d) => `${d.playerName} %${fitDisplay({ levelFit: d.levelFit, currentFit: d.roleFitScore }).pct}`).join(', ')}` : 'yedek yok'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Yedek kulübesi ({bench.length})</h4>
                <ul className="space-y-1 text-sm">
                  {bench.map((b) => (
                    <li key={b.player.player.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <Link to={`/players/${b.player.player.id}`} className="font-medium hover:underline">
                          {b.player.player.name}
                        </Link>{' '}
                        <span className="text-xs text-muted">
                          {b.player.player.positions[0]} · {b.player.player.overall}
                        </span>
                      </span>
                      <span className="text-xs text-muted">
                        {b.covers.length > 0
                          ? `yedeği: ${b.covers.map((c) => `${c.slotId} %${c.pct}`).join(', ')}`
                          : b.player.player.positions.includes('GK') ? 'yedek kaleci' : 'ilk 11’e yedek değil'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
