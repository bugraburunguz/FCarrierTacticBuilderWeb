import { Link } from 'react-router-dom'
import type { CareerPlayer, RuleFinding, SquadFit } from '../api/types'
import { scoutLink } from '../lib/scout'
import { computeVerdicts, VERDICT_LABEL, type Verdict } from '../lib/verdicts'
import { BadgeDot, Card, Pill, ScoreBar } from './ui'

const RULE_TONE: Record<RuleFinding['severity'], 'rose' | 'amber' | 'emerald'> = { RISK: 'rose', WARN: 'amber', PLUS: 'emerald' }
const RULE_LABEL: Record<RuleFinding['severity'], string> = { RISK: 'Risk', WARN: 'Uyarı', PLUS: 'Artı' }
const VERDICT_TONE: Record<Verdict, 'emerald' | 'sky' | 'amber' | 'rose'> = { KEEP: 'emerald', DEVELOP: 'sky', LOAN: 'amber', SELL: 'rose' }

interface Props {
  result: SquadFit
  squad: CareerPlayer[]
  budgetEur?: number
  chargedText?: string
}

export function FitResults({ result, squad, budgetEur, chargedText }: Props) {
  const verdicts = computeVerdicts(squad, result, budgetEur)
  const order: Verdict[] = ['SELL', 'LOAN', 'DEVELOP', 'KEEP']

  return (
    <div className="space-y-4">
      <Card title="Genel uyum">
        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreBar label="SquadFit" value={result.squadFit} hint="Kadro bu rollere uyuyor mu?" />
          <ScoreBar label="IntentFit" value={result.intentFit} hint={result.intentFit === undefined ? 'Slotlara davranış seçersen hesaplanır' : 'Seçtiğin oyunu oynayabiliyor mu?'} />
        </div>
        <p className="mt-3 text-sm">{result.summary}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{result.attackPattern}</p>
        {chargedText && <p className="mt-2 text-xs text-slate-500">{chargedText}</p>}
      </Card>

      <Card title="Zayıf halkalar">
        {result.weakLinks.length === 0 ? (
          <p className="text-sm text-emerald-700">Zayıf halka yok — tüm slotlar rolüne uygun.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {result.weakLinks.map((w) => (
              <li key={w.slotId} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <BadgeDot state={w.badge} /> {w.sentence}
                </span>
                <Link to={scoutLink(w.scoutQuery)} className="text-emerald-700 underline">
                  Scout et
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Kim kalmalı, kim gitmeli? (taktiğe ve bütçene göre)">
        <ul className="space-y-1 text-sm">
          {order.flatMap((verdict) =>
            verdicts
              .filter((v) => v.verdict === verdict)
              .map((v) => (
                <li key={v.playerId} className="flex items-start gap-2">
                  <span className="w-20 shrink-0">
                    <Pill tone={VERDICT_TONE[v.verdict]}>{VERDICT_LABEL[v.verdict]}</Pill>
                  </span>
                  <span>
                    <Link to={`/players/${v.playerId}`} className="font-medium hover:underline">
                      {v.name}
                    </Link>{' '}
                    <span className="text-slate-500">— {v.reason}</span>
                  </span>
                </li>
              )),
          )}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Öneriler kurallara dayalı bir rehberdir (ilk 11/yedek durumu, yaş, potansiyel farkı, bütçe). Satış/kiralık bedelini Kadro sayfasından girersin.</p>
      </Card>

      {result.rules.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.rules.map((r) => (
            <Card key={r.ruleId} title={<span><Pill tone={RULE_TONE[r.severity]}>{RULE_LABEL[r.severity]}</Pill> {r.title}</span>}>
              <p className="text-sm">{r.message}</p>
              {r.fix && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Çözüm: {r.fix}</p>}
            </Card>
          ))}
        </div>
      )}

      <Card title="Slot detayları">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-1">Slot</th><th>Rol</th><th>Oyuncu</th><th>RoleFit</th><th>Bu rolde</th><th>IntentFit</th><th>Yedekler</th></tr>
            </thead>
            <tbody>
              {result.slots.map((s) => (
                <tr key={s.slotId} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="py-1.5 font-medium">{s.slotId}</td>
                  <td>{s.roleName}</td>
                  <td>{s.playerName ?? '—'}</td>
                  <td>{s.roleFit ? <><BadgeDot state={s.roleFit.badge} /> %{Math.round(s.roleFit.score)}</> : '—'}</td>
                  <td className="tabular-nums">{s.roleFit?.projectedRating ?? '—'}</td>
                  <td>{s.intentFit ? `%${s.intentFit.score}` : '—'}</td>
                  <td className="text-xs text-slate-500">{s.depth.map((d) => `${d.playerName} (%${Math.round(d.roleFitScore)})`).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
