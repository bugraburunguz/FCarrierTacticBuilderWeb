import type { FitRoleResult } from '../api/types'
import { ATTR_LABELS } from '../lib/format'
import { BadgeDot, ScoreBar } from './ui'

export function FitResultCard({ result, compact = false }: { result: FitRoleResult; compact?: boolean }) {
  const { roleFit, intentFit } = result
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <BadgeDot state={roleFit.badge} />
        <p className="text-sm font-medium">{roleFit.badgeText}</p>
        <span className="rounded bg-surface-2 px-2 py-0.5 text-xs">
          Bu rolde ≈ <strong>{roleFit.projectedRating}</strong> oynar
        </span>
        {roleFit.outOfPosition && <span className="text-xs text-code">Mevki dışı</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreBar label="RoleFit" value={roleFit.score} hint="Oyuncu bu role uyuyor mu?" />
        {intentFit && <ScoreBar label="IntentFit" value={intentFit.score} hint="Seçtiğin davranışları yapabilir mi?" />}
      </div>
      {!compact && (
        <>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted">Silahlar</h3>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {roleFit.weaponChecks.map((w) => (
                <li key={w.attr} className="flex items-center gap-2">
                  <BadgeDot state={w.state} />
                  <span>
                    {ATTR_LABELS[w.attr] ?? w.attr}: <strong>{w.value}</strong> <span className="text-muted">(hedef {w.target}, alt sınır {w.effectiveMin})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {intentFit && intentFit.perTag.length > 0 && (
            <ul className="space-y-1 text-sm">
              {intentFit.perTag.map((t) => (
                <li key={t.tagId} className="flex items-start gap-2">
                  <BadgeDot state={t.state} />
                  <span>{t.note}</span>
                </li>
              ))}
            </ul>
          )}
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
            {roleFit.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
