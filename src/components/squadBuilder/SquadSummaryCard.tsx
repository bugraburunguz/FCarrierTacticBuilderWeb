import type { Formation } from '../../api/types'
import { Select } from '../ui'
import type { SlotView } from './PositionCard'

interface Props {
  formations: Formation[]
  formationId: string
  onFormation: (id: string) => void
  views: SlotView[]
  weakReasons: Record<string, string | undefined>
}

export function SquadSummaryCard({ formations, formationId, onFormation, views, weakReasons }: Props) {
  const placed = views.filter((v) => v.player)
  const fitted = placed.filter((v) => v.fit)
  const squadFit = fitted.length ? Math.round(fitted.reduce((s, v) => s + (v.fit?.pct ?? 0), 0) / fitted.length) : undefined
  const average = placed.length ? Math.round(placed.reduce((s, v) => s + (v.player?.overall ?? 0), 0) / placed.length) : undefined
  const weakest = fitted.length ? fitted.reduce((a, b) => ((a.fit?.pct ?? 0) <= (b.fit?.pct ?? 0) ? a : b)) : undefined

  return (
    <section className="rounded-md border border-line bg-surface p-3.5 text-ink">
      <h2 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent">Kadro Özeti</h2>
      <div className="flex items-center justify-between gap-2 py-2 text-[13px]">
        <label htmlFor="sb-formation">Formasyon</label>
        <Select id="sb-formation" value={formationId} onChange={(e) => onFormation(e.target.value)} className="!w-auto !bg-surface-2 !text-ink">
          {[3, 4, 5].map((backs) => (
            <optgroup key={backs} label={`${backs} defans`}>
              {formations
                .filter((f) => f.id.startsWith(String(backs)))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label ?? f.id}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between border-t border-line py-2 text-[13px]">
        <span>SquadFit</span>
        <span className="flex items-center gap-2 font-extrabold">
          {squadFit !== undefined ? `%${squadFit}` : '—'}
          <span className="h-2 w-[120px] overflow-hidden rounded-full border border-line bg-surface-2" aria-hidden="true">
            <i className="block h-full bg-accent-bg" style={{ width: `${squadFit ?? 0}%` }} />
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-line py-2 text-[13px]">
        <span>Ortalama OVR</span>
        <span className="font-extrabold">{average ?? '—'}</span>
      </div>
      <div className="flex items-center justify-between border-t border-line py-2 text-[13px]">
        <span>Dizilen</span>
        <span className="font-extrabold">{placed.length} / {views.length}</span>
      </div>
      {weakest?.fit && (
        <div className="mt-1 rounded-md border border-danger-line bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
          Zayıf halka: <b>{weakest.position}</b> (%{weakest.fit.pct}
          {weakReasons[weakest.slotId] ? ` — ${weakReasons[weakest.slotId]}` : ''})
        </div>
      )}
    </section>
  )
}
