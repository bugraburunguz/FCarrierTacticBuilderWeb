import { useState } from 'react'
import type { CareerPlayer, Formation } from '../../../api/types'
import { HelpPopover } from '../../../components/ui'
import { Chip, Segmented } from '../../../design/components/primitives'
import type { PositionNeed } from '../../../lib/depth'
import { formationName, POSITION_LABELS, type DepthState } from '../../../lib/positions'
import { buildBaseCells, buildCell, cellTitle, formationRows, regionSummaries, ROWS, SIDED_LABELS, slotSpec, type Cell } from '../../../lib/squadDensity'

// Yüzey her zaman opak (--sheet-bg); durum kalın kenar + metinle (yarı saydam renk saha zemininde açık temada okunmuyordu, FAZ 3).
const STATE: Record<DepthState, { text: string; tone: 'bad' | 'good' | 'warn'; cell: string }> = {
  thin: { text: 'Az', tone: 'bad', cell: 'border-2 border-[var(--bad)]' },
  ok: { text: 'Yeterli', tone: 'good', cell: 'border border-[var(--good)]' },
  dense: { text: 'Çok', tone: 'warn', cell: 'border-2 border-[var(--warn)]' },
}

/** Bölge özeti (Hücum / Orta saha / Defans / Kaleci): oyuncu sayısı, ort. overall ve az/çok mevkiler; renk yanında metin hep var. */
export function RegionSummary({ squad, needs }: { squad: CareerPlayer[]; needs: PositionNeed[] }) {
  const regions = regionSummaries(squad, buildBaseCells(squad, needs))
  return (
    <ul aria-label="Bölge özeti" className="grid grid-cols-2 gap-2">
      {regions.map((r) => (
        <li key={r.label} className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--glass-border)] p-2 text-sm">
          <span className="flex items-baseline justify-between gap-1">
            <strong className="font-semibold">{r.label}</strong>
            <span className="text-xs text-ink-2">{r.count} oyuncu</span>
          </span>
          <span className="text-xs text-ink-2">Ort. <b className="font-[var(--font-num)] tabular-nums text-ink">{r.avgOverall ? r.avgOverall.toFixed(1) : '–'}</b>{r.avgAge ? <> · yaş <b className="font-[var(--font-num)] tabular-nums text-ink">{r.avgAge.toFixed(1)}</b></> : null}</span>
          <span className="flex flex-wrap gap-1">
            {r.thin.length > 0 && <Chip tone="bad">Az: {r.thin.join(', ')}</Chip>}
            {r.dense.length > 0 && <Chip tone="warn">Çok: {r.dense.join(', ')}</Chip>}
            {r.thin.length === 0 && r.dense.length === 0 && <Chip tone="good">Dengeli</Chip>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DepthCell({ cell }: { cell: Cell }) {
  const [min, max] = cell.guide
  const state = STATE[cell.state]
  const total = cell.natural.length + cell.flex.length
  return (
    <div data-depth-cell title={cellTitle(cell)} className={`rounded-[var(--radius-sm)] bg-[var(--sheet-bg)] p-1.5 text-xs text-ink ${state.cell}`}>
      {/* Dar hücrede (375, 4-5'li hat) metin kesilmez, alt satıra geçer. */}
      <div className="flex flex-wrap items-center justify-between gap-x-1">
        <strong className="text-[13px]">{cell.position}</strong>
        <span className="font-semibold">{state.text}</span>
      </div>
      {/* FAZ 6a-B: büyük sayı mevki kapasitesi (listelenen tüm mevkiler); birincil/ikincil ayrımı metinle. */}
      <div className="flex items-baseline gap-1">
        <span data-depth-total className="font-[var(--font-num)] text-base font-semibold tabular-nums">{total}</span>
        <span className="text-ink-2">/ {cell.required ?? `${min}–${max}`}</span>
      </div>
      {total === 0 ? <div className="text-ink-2">Oyuncu yok</div> : (
        <>
          <div className="break-words text-ink-2">{cell.natural.length} birincil · {cell.flex.length} ikincil</div>
          {cell.best !== undefined && <div className="break-words text-ink-2">En iyi <b className="text-ink">{cell.best}</b></div>}
        </>
      )}
      <span className="sr-only">{SIDED_LABELS[cell.position] ?? POSITION_LABELS[cell.base] ?? cell.base}</span>
    </div>
  )
}

/**
 * v3 mevki yoğunluk haritası (V3-07b; v2 SquadDensity'nin karşılığı, aynı hesap lib/squadDensity): taktiğe göre (dizilim sahası) ya da genel
 * (mevki ızgarası). Saha zemini v3 saha token'ları; hücre yüzeyi opak.
 */
export function DepthMap({ squad, needs, formation }: { squad: CareerPlayer[]; needs: PositionNeed[]; formation?: Formation }) {
  const [mode, setMode] = useState<'tactic' | 'general'>('tactic')
  const cells = buildBaseCells(squad, needs)
  const byTactic = formation !== undefined && mode === 'tactic'
  return (
    <div aria-label="Mevki yoğunluk haritası" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-sm font-semibold">
          {byTactic ? `Dizilim: ${formationName(formation)}` : 'Genel mevki haritası'}
          <HelpPopover label="Mevki haritası nasıl okunur">
            {needs.length > 0 ? 'Renkler seçili taktiğin ihtiyacına göre (ilk 11 + rotasyon). ' : 'Renkler genel derinlik rehberine göre (taktik seçilmedi). '}
            Sayı: o mevkiyi listeleyen tüm oyuncular; altında ana mevkisi o olan (birincil) ve alternatif olarak listeleyen (ikincil) ayrı yazılır. Soldaki hücrelerde sol ayaklılar, sağdakilerde sağ ayaklılar; iki ayaklılar (zayıf ayak 4+) iki tarafta da sayılır.
          </HelpPopover>
        </span>
        {formation && <Segmented label="Harita" value={mode} options={[{ id: 'tactic', label: 'Taktiğe göre' }, { id: 'general', label: 'Genel' }]} onChange={setMode} />}
      </div>
      {byTactic ? (
        <div
          data-depth-field
          className="mx-auto flex w-full max-w-[460px] flex-col gap-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border)] p-2"
          // FAZ 6a-I: Cyber-Pitch zemini (Pitch field="cyber" ile aynı token'lar); eski yeşil çim değil.
          style={{ background: 'repeating-linear-gradient(180deg, var(--cyber-pitch-1) 0 10%, var(--cyber-pitch-2) 10% 20%)' }}
        >
          {formationRows(formation.slots).map((row) => (
            <div key={row.map((s) => s.slotId).join('-')} data-depth-row className="flex justify-center gap-1.5">
              {row.map((slot) => (
                <div key={slot.slotId} className="min-w-0 max-w-[25%] flex-1 basis-0">
                  <DepthCell cell={buildCell(slotSpec(slot, formation.slots), cells)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ROWS.map((row, index) => (
            <div key={index} className="flex justify-center gap-1.5">
              {row.map((spec) => (
                <div key={spec.key} className="min-w-0 flex-1 basis-0">
                  <DepthCell cell={buildCell(spec, cells)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
