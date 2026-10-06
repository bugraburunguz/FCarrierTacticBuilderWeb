import type { CareerPlayer } from '../api/types'
import type { PositionNeed } from '../lib/depth'
import { DEPTH_GUIDE, depthState, POSITION_LABELS, primaryPosition, type DepthState } from '../lib/positions'
import { Pill } from './ui'

interface CellSpec {
  key: string
  base: string
  side?: 'L' | 'R'
}

const spec = (key: string, base: string, side?: 'L' | 'R'): CellSpec => ({ key, base, side })

const ROWS: CellSpec[][] = [
  [spec('LW', 'LW'), spec('LST', 'ST', 'L'), spec('ST', 'ST'), spec('RST', 'ST', 'R'), spec('RW', 'RW')],
  [spec('LCAM', 'CAM', 'L'), spec('CAM', 'CAM'), spec('RCAM', 'CAM', 'R')],
  [spec('LM', 'LM'), spec('LCM', 'CM', 'L'), spec('CM', 'CM'), spec('RCM', 'CM', 'R'), spec('RM', 'RM')],
  [spec('LCDM', 'CDM', 'L'), spec('CDM', 'CDM'), spec('RCDM', 'CDM', 'R')],
  [spec('LB', 'LB'), spec('LCB', 'CB', 'L'), spec('RCB', 'CB', 'R'), spec('RB', 'RB')],
  [spec('GK', 'GK')],
]

const SIDED_LABELS: Record<string, string> = {
  LST: 'Sol santrfor', RST: 'Sağ santrfor', LCAM: 'Sol ofansif OS', RCAM: 'Sağ ofansif OS',
  LCM: 'Sol merkez OS', RCM: 'Sağ merkez OS', LCDM: 'Sol defansif OS', RCDM: 'Sağ defansif OS',
  LCB: 'Sol stoper', RCB: 'Sağ stoper',
}

const SIDED_GUIDE: [number, number] = [1, 2]
const TWO_FOOTED_WEAK_FOOT = 4

const REGIONS: { label: string; positions: string[] }[] = [
  { label: 'Hücum', positions: ['LW', 'ST', 'RW'] },
  { label: 'Orta saha', positions: ['LM', 'CAM', 'CM', 'CDM', 'RM'] },
  { label: 'Defans', positions: ['LB', 'CB', 'RB'] },
  { label: 'Kaleci', positions: ['GK'] },
]

const STATE_STYLE: Record<DepthState, string> = {
  thin: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
  ok: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  dense: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
}

const STATE_LABEL: Record<DepthState, { text: string; tone: 'rose' | 'emerald' | 'amber' }> = {
  thin: { text: 'Az', tone: 'rose' },
  ok: { text: 'Yeterli', tone: 'emerald' },
  dense: { text: 'Çok', tone: 'amber' },
}

const average = (values: number[]) => (values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length)

interface Cell {
  position: string
  natural: CareerPlayer[]
  flex: CareerPlayer[]
  state: DepthState
  best?: number
  avg?: number
  required?: number
  guide: [number, number]
}

const BASE_POSITIONS = [...new Set(ROWS.flat().map((c) => c.base))]

const isTwoFooted = (p: CareerPlayer) => (p.player.weakFoot ?? 0) >= TWO_FOOTED_WEAK_FOOT

function playsSide(p: CareerPlayer, side: 'L' | 'R'): boolean {
  if (isTwoFooted(p)) {
    return true
  }
  return p.player.preferredFoot === (side === 'L' ? 'Left' : 'Right')
}

function summarize(key: string, natural: CareerPlayer[], flex: CareerPlayer[], state: DepthState, guide: [number, number], required?: number): Cell {
  const overalls = natural.map((s) => s.player.overall)
  return { position: key, natural, flex, state, guide, required, best: overalls.length ? Math.max(...overalls) : undefined, avg: average(overalls) }
}

function buildBaseCells(squad: CareerPlayer[], needs: PositionNeed[]): Map<string, Cell> {
  const needByPosition = new Map(needs.map((n) => [n.position, n]))
  const cells = new Map<string, Cell>()
  for (const position of BASE_POSITIONS) {
    const natural = squad.filter((s) => primaryPosition(s.player.positions) === position)
    const flex = squad.filter((s) => primaryPosition(s.player.positions) !== position && s.player.positions.includes(position))
    const need = needByPosition.get(position)
    cells.set(position, summarize(position, natural, flex, need ? need.state : depthState(position, natural.length), DEPTH_GUIDE[position] ?? [1, 3], need?.required))
  }
  return cells
}

function buildCell(spec: CellSpec, base: Map<string, Cell>): Cell {
  const baseCell = base.get(spec.base)!
  if (!spec.side) {
    return { ...baseCell, position: spec.key }
  }
  const side = spec.side
  const natural = baseCell.natural.filter((p) => playsSide(p, side))
  const flex = baseCell.flex.filter((p) => playsSide(p, side))
  const [min, max] = SIDED_GUIDE
  const state: DepthState = natural.length < min ? 'thin' : natural.length > max ? 'dense' : 'ok'
  return summarize(spec.key, natural, flex, state, SIDED_GUIDE)
}

export function SquadDensity({ squad, needs }: { squad: CareerPlayer[]; needs: PositionNeed[] }) {
  const cells = buildBaseCells(squad, needs)
  const usingTactic = needs.length > 0

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Bölge özeti">
        {REGIONS.map((region) => {
          const players = squad.filter((s) => region.positions.includes(primaryPosition(s.player.positions)))
          const avgOverall = average(players.map((p) => p.player.overall))
          const avgAge = average(players.flatMap((p) => (p.player.age ? [p.player.age] : [])))
          const regionCells = region.positions.map((p) => cells.get(p)!).filter(Boolean)
          const thin = regionCells.filter((c) => c.state === 'thin').map((c) => c.position)
          const dense = regionCells.filter((c) => c.state === 'dense').map((c) => c.position)
          return (
            <div key={region.label} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-600">
              <div className="flex items-center justify-between">
                <strong>{region.label}</strong>
                <span className="text-slate-500">{players.length} oyuncu</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ort. overall <b className="text-slate-800 dark:text-slate-100">{avgOverall ? avgOverall.toFixed(1) : '—'}</b>
                {avgAge ? <> · ort. yaş <b className="text-slate-800 dark:text-slate-100">{avgAge.toFixed(1)}</b></> : null}
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

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-emerald-50 to-white p-3 dark:border-slate-600 dark:from-slate-800 dark:to-slate-800" aria-label="Mevki yoğunluk haritası">
        <div className="space-y-2">
          {ROWS.map((row, index) => (
            <div key={index} className="flex justify-center gap-2">
              {row.map((cellSpec) => (
                <div key={cellSpec.key} className="w-1/5 min-w-[96px]">
                  <DensityCell cell={buildCell(cellSpec, cells)} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {usingTactic
            ? 'Renkler seçili taktiğin ihtiyacına göre (ilk 11 + rotasyon). '
            : 'Renkler genel derinlik rehberine göre (taktik seçilmedi). '}
          Sayı: asıl mevkisi o olan + (alternatif mevkisi o olan). Soldaki hücrelerde sol ayaklılar, sağdakilerde sağ ayaklılar; iki ayaklılar (zayıf ayak 4+) iki tarafta da sayılır.
        </p>
      </div>
    </div>
  )
}

function footMark(p: CareerPlayer): string {
  if (isTwoFooted(p)) {
    return 'iki ayaklı'
  }
  return p.player.preferredFoot === 'Left' ? 'sol ayak' : 'sağ ayak'
}

function DensityCell({ cell }: { cell: Cell }) {
  const [min, max] = cell.guide
  const label = STATE_LABEL[cell.state]
  const names = [...cell.natural].sort((a, b) => b.player.overall - a.player.overall)
  const title = [
    ...names.map((s) => `${s.player.name} (${s.player.overall}) · ${footMark(s)}`),
    ...cell.flex.map((s) => `${s.player.name} (${s.player.overall}) · ${footMark(s)} — alternatif`),
  ].join(String.fromCharCode(10))
  return (
    <div title={title} className={`rounded-xl border p-2 text-xs transition hover:shadow-md ${STATE_STYLE[cell.state]}`}>
      <div className="flex items-center justify-between gap-1">
        <strong className="text-sm">{cell.position}</strong>
        <Pill tone={label.tone}>{label.text}</Pill>
      </div>
      <div className="mt-0.5 truncate text-slate-500">{POSITION_LABELS[cell.position] ?? SIDED_LABELS[cell.position]}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums">{cell.natural.length}</span>
        {cell.flex.length > 0 && <span className="text-slate-500">+{cell.flex.length}</span>}
        <span className="text-slate-400">/ {cell.required ?? `${min}–${max}`}</span>
      </div>
      <div className="text-slate-500">
        {cell.best ? (
          <>
            En iyi <b className="text-slate-800 dark:text-slate-100">{cell.best}</b> · ort. {cell.avg?.toFixed(0)}
          </>
        ) : (
          'Oyuncu yok'
        )}
      </div>
    </div>
  )
}
