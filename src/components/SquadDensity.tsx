import { useState } from 'react'
import { formationName } from '../lib/positions'
import type { CareerPlayer, Formation } from '../api/types'
import type { PositionNeed } from '../lib/depth'
import { POSITION_LABELS, type DepthState } from '../lib/positions'
import { buildBaseCells, buildCell, cellTitle, regionSummaries, ROWS, SIDED_LABELS, slotSpec, slotTop, type Cell } from '../lib/squadDensity'
import { Pill } from './ui'

/** v2 mevki yoğunluğu (v3: features/squad/kadro/DepthPanel). Hesap lib/squadDensity'de. */
const STATE_STYLE: Record<DepthState, string> = {
  thin: 'border-danger-line bg-danger-soft',
  ok: 'border-accent bg-accent-soft',
  dense: 'border-line bg-code-soft',
}

const STATE_LABEL: Record<DepthState, { text: string; tone: 'rose' | 'emerald' | 'amber' }> = {
  thin: { text: 'Az', tone: 'rose' },
  ok: { text: 'Yeterli', tone: 'emerald' },
  dense: { text: 'Çok', tone: 'amber' },
}

export function SquadDensity({ squad, needs, formation, compact = false }: { squad: CareerPlayer[]; needs: PositionNeed[]; formation?: Formation; compact?: boolean }) {
  const [mode, setMode] = useState<'tactic' | 'general'>('tactic')
  const cells = buildBaseCells(squad, needs)
  const byTactic = formation !== undefined && mode === 'tactic'
  const usingTactic = needs.length > 0

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4'} aria-label="Bölge özeti">
        {regionSummaries(squad, cells).map(({ label, count, avgOverall, avgAge, thin, dense }) => {
          return (
            <div key={label} className={`rounded-md border border-line text-sm ${compact ? 'p-2' : 'p-3'}`}>
              <div className="flex items-center justify-between">
                <strong>{label}</strong>
                <span className="text-muted">{count} oyuncu</span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                Ort. overall <b className="text-ink">{avgOverall ? avgOverall.toFixed(1) : '—'}</b>
                {avgAge ? <> · ort. yaş <b className="text-ink">{avgAge.toFixed(1)}</b></> : null}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {thin.length > 0 && <Pill tone="rose">Az: {thin.join(', ')}</Pill>}
                {dense.length > 0 && <Pill tone="amber">Çok: {dense.join(', ')}</Pill>}
                {thin.length === 0 && dense.length === 0 && <Pill tone="emerald">Dengeli</Pill>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-md border border-line bg-gradient-to-b from-emerald-50 to-white p-3" aria-label="Mevki yoğunluk haritası">
        {formation && (
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <strong>{byTactic ? `Dizilim: ${formationName(formation)}` : 'Genel mevki haritası'}</strong>
            <div role="tablist" className="flex gap-1">
              {(['tactic', 'general'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                  className={`rounded-full px-2.5 py-1 font-medium ${mode === m ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-muted'}`}>
                  {m === 'tactic' ? 'Taktiğe göre' : 'Genel'}
                </button>
              ))}
            </div>
          </div>
        )}
        {byTactic ? (
          <div className="overflow-x-auto">
            <div className={`relative mx-auto aspect-[100/130] w-full overflow-hidden rounded-md shadow-inner ring-1 ring-accent ${compact ? 'min-w-[400px] max-w-[470px]' : 'min-w-[560px] max-w-[640px]'}`}>
              <PitchBackground />
              {formation.slots.map((slot) => (
                <div key={slot.slotId} className={`absolute z-10 w-[17%] -translate-x-1/2 -translate-y-1/2 ${compact ? 'min-w-[70px]' : 'min-w-[96px]'}`} style={{ left: `${slot.x}%`, top: `${slotTop(slot, formation.slots)}%` }}>
                  <DensityCell cell={buildCell(slotSpec(slot, formation.slots), cells)} compact={compact} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {ROWS.map((row, index) => (
              <div key={index} className="flex justify-center gap-2">
                {row.map((cellSpec) => (
                  <div key={cellSpec.key} className={`w-1/5 ${compact ? 'min-w-[70px]' : 'min-w-[96px]'}`}>
                    <DensityCell cell={buildCell(cellSpec, cells)} compact={compact} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">Nasıl okunur?</summary>
          <p className="mt-1">
          {usingTactic
            ? 'Renkler seçili taktiğin ihtiyacına göre (ilk 11 + rotasyon). '
            : 'Renkler genel derinlik rehberine göre (taktik seçilmedi). '}
          Sayı: asıl mevkisi o olan + (alternatif mevkisi o olan). Soldaki hücrelerde sol ayaklılar, sağdakilerde sağ ayaklılar; iki ayaklılar (zayıf ayak 4+) iki tarafta da sayılır.
          </p>
        </details>
      </div>
    </div>
  )
}

function PitchBackground() {
  const bands = Array.from({ length: 10 }, (_, i) => i)
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
      {bands.map((i) => (
        <rect key={i} x="0" y={i * 13} width="100" height="13" fill={i % 2 === 0 ? '#2f8f4e' : '#34a056'} />
      ))}
      <g stroke="#ffffffcc" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke">
        <rect x="2.5" y="2.5" width="95" height="125" />
        <line x1="2.5" y1="65" x2="97.5" y2="65" />
        <circle cx="50" cy="65" r="10" />
        <rect x="24" y="2.5" width="52" height="17" />
        <rect x="38" y="2.5" width="24" height="6.5" />
        <rect x="24" y="110.5" width="52" height="17" />
        <rect x="38" y="121" width="24" height="6.5" />
        <path d="M 40 19.5 A 10 10 0 0 0 60 19.5" />
        <path d="M 40 110.5 A 10 10 0 0 1 60 110.5" />
      </g>
      <circle cx="50" cy="65" r="0.9" fill="#ffffffcc" />
    </svg>
  )
}

function DensityCell({ cell, compact = false }: { cell: Cell; compact?: boolean }) {
  const [min, max] = cell.guide
  const label = STATE_LABEL[cell.state]
  const title = cellTitle(cell)
  return (
    <div title={title} className={`rounded-md border text-xs   transition hover: ${compact ? 'p-1.5' : 'p-2'} ${STATE_STYLE[cell.state]}`}>
      <div className="flex items-center justify-between gap-1">
        <strong className="text-sm">{cell.position}</strong>
        {compact ? <span className="text-[10px] font-semibold">{label.text}</span> : <Pill tone={label.tone}>{label.text}</Pill>}
      </div>
      {!compact && <div className="mt-0.5 truncate text-muted">{SIDED_LABELS[cell.position] ?? POSITION_LABELS[cell.base] ?? cell.base}</div>}
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums">{cell.natural.length}</span>
        {cell.flex.length > 0 && <span className="text-muted">+{cell.flex.length}</span>}
        <span className="text-muted">/ {cell.required ?? `${min}–${max}`}</span>
      </div>
      <div className="text-muted">
        {cell.best ? (
          <>
            {compact ? '' : 'En iyi '}<b className="text-ink">{cell.best}</b>{compact ? '' : ` · ort. ${cell.avg?.toFixed(0)}`}
          </>
        ) : (
          'Oyuncu yok'
        )}
      </div>
    </div>
  )
}
