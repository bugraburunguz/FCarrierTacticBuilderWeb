import type { ChangeType, PlayerDiff } from '../api/types'
import { ATTR_LABELS } from '../lib/format'
import { PLAYSTYLES } from '../lib/playstyles'
import { Card } from './ui'

const GREEN = 'text-[#1f9d63] dark:text-[#2ec27e]'
const RED = 'text-[#d64545] dark:text-[#ff6b6b]'
const BLUE = 'text-[#1f6fc4] dark:text-[#4da6ff]'

const BADGE: Record<ChangeType, { label: string; icon: string; tone: string }> = {
  UPGRADE: { label: 'Güncellendi', icon: '▲', tone: GREEN },
  DOWNGRADE: { label: 'Düşürüldü', icon: '▼', tone: RED },
  MIXED: { label: 'Değişti', icon: '↕', tone: BLUE },
  TRANSFER: { label: 'Transfer', icon: '⇄', tone: BLUE },
  NEW: { label: 'Yeni oyuncu', icon: '＋', tone: GREEN },
  REMOVED: { label: 'Dosyadan çıktı', icon: '－', tone: RED },
}

export function versionLabel(diff: PlayerDiff): string {
  return diff.versionNo ? (diff.previousVersionNo ? `v${diff.previousVersionNo} → v${diff.versionNo}` : `v${diff.versionNo}`) : ''
}

export function DiffBadge({ diff }: { diff: PlayerDiff }) {
  const badge = BADGE[diff.changeType]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 text-xs font-semibold ${badge.tone}`}>
      <span aria-hidden="true">{badge.icon}</span> {badge.label}
      {versionLabel(diff) && <span className="font-normal opacity-80">· {versionLabel(diff)}</span>}
    </span>
  )
}

export function DeltaMark({ delta }: { delta: number }) {
  if (delta === 0) {
    return null
  }
  return (
    <span className={`text-sm font-bold tabular-nums ${delta > 0 ? GREEN : RED}`}>
      {delta > 0 ? '▲+' : '▼−'}
      {Math.abs(delta)}
    </span>
  )
}

function psName(label: string): string {
  const plus = label.endsWith('+')
  const id = plus ? label.slice(0, -1) : label
  return `${PLAYSTYLES[id]?.name ?? id}${plus ? '+' : ''}`
}

interface Props {
  diff: PlayerDiff
  onlyChanged: boolean
  onToggle: (value: boolean) => void
}

export function PlayerDiffPanel({ diff, onlyChanged, onToggle }: Props) {
  const attributes = [...diff.attributes].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const styles = diff.playStyles
  return (
    <Card title="Değişiklikler" actions={<DiffBadge diff={diff} />}>
      <details open className="space-y-3 text-sm">
        <summary className="cursor-pointer text-xs text-slate-500">Bir önceki sürüme göre ({versionLabel(diff) || 'son güncelleme'})</summary>
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {diff.overall && (
              <span>
                Genel <b className="tabular-nums">{diff.overall.new}</b> <DeltaMark delta={diff.overall.delta} />{' '}
                <span className="text-xs text-slate-500">şuydu {diff.overall.old} → şu oldu {diff.overall.new}</span>
              </span>
            )}
            {diff.potential && (
              <span>
                Potential* <b className="tabular-nums">{diff.potential.new}</b> <DeltaMark delta={diff.potential.delta} />
              </span>
            )}
            {diff.positions && (
              <span>
                Mevki: <span className="text-slate-500">{diff.positions.old}</span> → <span className={GREEN}>{diff.positions.new}</span>
              </span>
            )}
            {diff.acceleRate && (
              <span className={BLUE}>
                AcceleRATE: {diff.acceleRate.old ?? '—'} → {diff.acceleRate.new ?? '—'}
              </span>
            )}
            {diff.club && (
              <span className={BLUE}>
                <span aria-hidden="true">⇄</span> {diff.club.old ?? '—'} → {diff.club.new ?? '—'}
              </span>
            )}
          </div>

          {attributes.length > 0 && (
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {attributes.map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-2" title={`şuydu ${a.old} → şu oldu ${a.new}`}>
                  <span>{ATTR_LABELS[a.key] ?? a.key}</span>
                  <span className="tabular-nums">
                    <b>{a.new}</b> <DeltaMark delta={a.delta} /> <span className="text-xs text-slate-500">({a.old} → {a.new})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {styles && (styles.added.length > 0 || styles.removed.length > 0 || styles.upgraded.length > 0 || styles.downgraded.length > 0) && (
            <ul className="flex flex-wrap gap-2">
              {styles.added.map((s) => (
                <li key={`a-${s}`} className={`rounded-full border border-current px-2 py-0.5 text-xs font-medium ${GREEN}`}>
                  + {psName(s)}
                </li>
              ))}
              {styles.removed.map((s) => (
                <li key={`r-${s}`} className={`rounded-full border border-current px-2 py-0.5 text-xs font-medium line-through ${RED}`}>
                  <span className="no-underline">−</span> {psName(s)}
                </li>
              ))}
              {styles.upgraded.map((u) => (
                <li key={`u-${u.from}`} className={`rounded-full border border-current px-2 py-0.5 text-xs font-medium ${BLUE}`}>
                  {psName(u.from)} → {psName(u.to)}
                </li>
              ))}
              {styles.downgraded.map((u) => (
                <li key={`d-${u.from}`} className={`rounded-full border border-current px-2 py-0.5 text-xs font-medium ${BLUE}`}>
                  {psName(u.from)} → {psName(u.to)}
                </li>
              ))}
            </ul>
          )}

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={onlyChanged} onChange={(e) => onToggle(e.target.checked)} />
            Yalnızca değişen özellikleri göster (aşağıdaki listede)
          </label>
        </div>
      </details>
    </Card>
  )
}
