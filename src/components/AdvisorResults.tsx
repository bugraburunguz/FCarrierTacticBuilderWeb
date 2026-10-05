import { Link } from 'react-router-dom'
import type { Advice, AdvisorCandidate, CareerPlayer } from '../api/types'
import { tacticStore } from '../state/tacticStore'
import { FitResults } from './FitResults'
import { CompareButton } from './CompareButton'
import { BadgeDot, Button, Card, Pill } from './ui'

const KIND_LABEL: Record<AdvisorCandidate['kind'], string> = { STYLE: 'Oyun felsefesi', REPLICA: 'Replika', ADAPTIVE: 'Kadroya özel' }
const VERDICT: Record<Advice['verdict'], { text: string; tone: 'emerald' | 'amber' | 'sky' }> = {
  BEST_FIT: { text: 'Bu kadro için en iyi kurulum', tone: 'emerald' },
  PHILOSOPHY_OK: { text: 'Anlayışına sadık kalabilirsin', tone: 'sky' },
  BETTER_ELSEWHERE: { text: 'Kadro başka bir oyuna daha yatkın', tone: 'amber' },
}

export function applyCandidate(candidate: AdvisorCandidate) {
  const slots: Record<string, { tags: string[]; roleId?: string }> = {}
  candidate.tactic.slots.forEach((s) => {
    slots[s.slotId] = { tags: s.tags ?? [], roleId: s.roleId }
  })
  tacticStore.set({ formation: candidate.formation, presetId: candidate.tactic.presetId, slots })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function CandidateRow({ candidate, label }: { candidate: AdvisorCandidate; label?: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>
        {label && <Pill tone="slate">{label}</Pill>} <strong>{candidate.name}</strong>{' '}
        <span className="text-slate-500">
          {candidate.formationLabel} · {KIND_LABEL[candidate.kind]}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums">%{candidate.score}</span>
        <Button variant="secondary" onClick={() => applyCandidate(candidate)}>
          Uygula
        </Button>
      </span>
    </li>
  )
}

interface Props {
  advice: Advice
  squad: CareerPlayer[]
  budgetEur?: number
}

export function AdvisorResults({ advice, squad, budgetEur }: Props) {
  const { recommended } = advice
  const verdict = VERDICT[advice.verdict]

  return (
    <div className="space-y-4">
      <Card title="Önerilen kurulum" actions={<Pill tone={verdict.tone}>{verdict.text}</Pill>}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{recommended.name}</p>
            <p className="text-sm text-slate-500">
              {recommended.formationLabel} · {KIND_LABEL[recommended.kind]} · kadro uyumu %{recommended.squadFit}
              {recommended.intentFit !== undefined ? ` · niyet uyumu %${recommended.intentFit}` : ''}
            </p>
          </div>
          <Button onClick={() => applyCandidate(recommended)}>Bu kurulumu uygula</Button>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {advice.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <Card title="Alternatifler">
        <ul className="space-y-2">
          {advice.philosophy && <CandidateRow candidate={advice.philosophy} label="Anlayışın" />}
          {advice.bestCustom && <CandidateRow candidate={advice.bestCustom} label="Kadroya özel" />}
          {advice.alternatives.map((c) => (
            <CandidateRow key={`${c.kind}-${c.presetId}-${c.formation}`} candidate={c} />
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          {advice.evaluated} kurulum denendi. Yüzde, ilk 11’in ortalama uyumudur; “Uygula” seçilen kurulumu saha ve slot ayarlarına yazar.
        </p>
      </Card>

      {recommended.lineup && <FitResults result={recommended.lineup} squad={squad} budgetEur={budgetEur} />}

      <Card title="Oyuncular en iyi hangi mevkide oynar?">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1">Oyuncu</th>
                <th>Listedeki mevkiler</th>
                <th>En iyi mevkiler (rol · uyum)</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {advice.playerPositions.map((p) => (
                <tr key={p.playerId} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="py-1.5 font-medium">
                    <Link to={`/players/${p.playerId}`} className="hover:underline">
                      {p.playerName}
                    </Link>
                  </td>
                  <td className="text-xs text-slate-500">{p.listedPositions.join(', ')}</td>
                  <td className="text-xs">
                    {p.best.map((b) => (
                      <div key={b.position}>
                        <strong>{b.position}</strong> {b.roleName} · %{Math.round(b.score)}
                        {!b.natural && <span className="text-amber-700"> (listede yok)</span>}
                      </div>
                    ))}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {advice.transferSuggestions && (
        <Card title="Transfer önerileri (zayıf slotlar)">
          {advice.transferSuggestions.length === 0 ? (
            <p className="text-sm text-emerald-700">Belirgin zayıf slot yok; transfer şart değil.</p>
          ) : (
            <div className="space-y-3">
              {advice.transferSuggestions.map((t) => (
                <div key={t.slotId}>
                  <h4 className="text-sm font-semibold">
                    {t.slotId} · {t.position}
                  </h4>
                  <ul className="mt-1 space-y-1 text-sm">
                    {t.items.map((item) =>
                      item.player ? (
                        <li key={item.player.id} className="flex items-center justify-between gap-2">
                          <span>
                            <BadgeDot state={item.roleFit.badge} />{' '}
                            <Link to={`/players/${item.player.id}`} className="font-medium hover:underline">
                              {item.player.name}
                            </Link>{' '}
                            <span className="text-xs text-slate-500">
                              {item.player.overall}
                              {item.player.club ? ` · ${item.player.club}` : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">%{Math.round(item.combined)}</span>
                            <CompareButton compact entry={{ id: item.player.id, name: item.player.name, overall: item.player.overall, position: item.player.positions[0] ?? '' }} />
                          </span>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
