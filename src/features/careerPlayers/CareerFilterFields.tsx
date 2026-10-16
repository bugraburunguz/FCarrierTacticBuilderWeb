import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayerFacets } from '../../api/types'
import { Input, Select } from '../../components/ui'
import { Chip } from '../../design/components/primitives'
import { ATTR_LABELS } from '../../lib/format'
import { ATTR_MIN_KEYS, BUCKETS, budgetKnown, CONTRACT_MONTHS, contractFilterAvailable, type CareerListFilters } from './careerFilters'

const label = 'flex flex-col gap-1 text-xs font-medium text-muted'
const STALE_MS = 300_000
const MILLION = 1_000_000
const toNum = (value: string): number | undefined => (value === '' ? undefined : Number(value))
/** Değer girişi milyon € (ondalık), adres çubuğunda tam sayı €. */
const toEur = (value: string): number | undefined => (value === '' || !Number.isFinite(Number(value)) ? undefined : Math.round(Number(value) * MILLION))
const fromEur = (value: number | undefined) => (value === undefined ? '' : String(value / MILLION))

function Range({ title, min, max, onMin, onMax, step, lo, hi }: { title: string; min: string | number; max: string | number; onMin: (v: string) => void; onMax: (v: string) => void; step?: string; lo: number; hi: number }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1">
      <legend className="pb-1 text-xs font-medium text-muted">{title}</legend>
      <div className="flex gap-2">
        <Input type="number" inputMode="decimal" min={lo} max={hi} step={step} value={min} onChange={(e) => onMin(e.target.value)} aria-label={`${title} en az`} placeholder="En az" className="min-w-0" />
        <Input type="number" inputMode="decimal" min={lo} max={hi} step={step} value={max} onChange={(e) => onMax(e.target.value)} aria-label={`${title} en çok`} placeholder="En çok" className="min-w-0" />
      </div>
    </fieldset>
  )
}

function Toggle({ text, checked, onChange, disabledReason }: { text: string; checked: boolean; onChange: (on: boolean) => void; disabledReason?: string }) {
  const reasonId = useId()
  const disabled = disabledReason !== undefined
  return (
    <span className="flex flex-col gap-0.5" title={disabledReason}>
      <label className={`inline-flex min-h-10 items-center gap-2 text-sm max-sm:min-h-11 ${disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer text-ink'}`}>
        <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={checked && !disabled} disabled={disabled} aria-describedby={disabled ? reasonId : undefined} onChange={(e) => onChange(e.target.checked)} />
        {text}
      </label>
      {disabled && <span id={reasonId} className="text-xs text-muted">{disabledReason}</span>}
    </span>
  )
}

/**
 * Kariyer listesi süzgeçleri (E3-10b): OVR/POT/yaş/değer aralığı, "Bütçeme sığar" (bütçe bilinmiyorsa pasif, nedeni yazılı),
 * sözleşme ≤ 6 ay (yalnız sözleşme verisi + oyun tarihi varken), kiralık (yalnız kiralık verisi varken), ulaşılabilirlik kovası.
 * Masaüstünde "Daha fazla filtre"de, mobilde "Filtreler" sheet'inde aynı bileşen.
 */
export function CareerFilterFields({ careerId, filters, set, facets }: { careerId: number; filters: CareerListFilters; set: (patch: Partial<CareerListFilters>) => void; facets?: CareerPlayerFacets }) {
  const bucketId = useId()
  const [teamTerm, setTeamTerm] = useState('')
  const leagues = useQuery({ queryKey: ['leagues', filters.gender], queryFn: () => endpoints.leagues(filters.gender), staleTime: STALE_MS })
  const nationalities = useQuery({ queryKey: ['nationalities'], queryFn: endpoints.nationalities, staleTime: STALE_MS })
  const teams = useQuery({ queryKey: ['career-teams', careerId, teamTerm], queryFn: () => endpoints.careerTeams(careerId, teamTerm), staleTime: STALE_MS })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[820px]:grid-cols-5">
        <label className={label}>
          Futbol
          <Select value={String(filters.gender)} onChange={(e) => set({ gender: e.target.value === '1' ? 1 : 0, league: undefined })}>
            <option value="0">Erkek</option>
            <option value="1">Kadın</option>
          </Select>
        </label>
        <label className={label}>
          Lig
          <Select value={filters.league ?? ''} onChange={(e) => set({ league: toNum(e.target.value) })}>
            <option value="">Hepsi</option>
            {(leagues.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </label>
        <label className={label}>
          Uyruk
          <Select value={filters.nat ?? ''} onChange={(e) => set({ nat: toNum(e.target.value) })}>
            <option value="">Hepsi</option>
            {(nationalities.data ?? []).map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </Select>
        </label>
        <label className={label}>
          Ayak
          <Select value={filters.foot ?? ''} onChange={(e) => set({ foot: e.target.value || undefined })}>
            <option value="">Hepsi</option>
            <option value="Right">Sağ</option>
            <option value="Left">Sol</option>
          </Select>
        </label>
        <fieldset className="flex min-w-0 flex-col gap-1">
          <legend className="pb-1 text-xs font-medium text-muted">Takım (kayıt)</legend>
          <Input type="search" value={teamTerm} onChange={(e) => setTeamTerm(e.target.value)} placeholder="Takım ara" aria-label="Takım ara" className="min-w-0" />
          <Select value={filters.team ?? ''} aria-label="Takım" disabled={filters.freeAgent} onChange={(e) => set({ team: toNum(e.target.value) })}>
            <option value="">Tüm takımlar</option>
            {(teams.data ?? []).map((t) => (
              <option key={t.teamId} value={t.teamId}>{t.name}</option>
            ))}
          </Select>
        </fieldset>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[820px]:grid-cols-4">
        <Range title="OVR" lo={1} hi={99} min={filters.ovrMin ?? ''} max={filters.ovrMax ?? ''} onMin={(v) => set({ ovrMin: toNum(v) })} onMax={(v) => set({ ovrMax: toNum(v) })} />
        <Range title="POT" lo={1} hi={99} min={filters.potMin ?? ''} max={filters.potMax ?? ''} onMin={(v) => set({ potMin: toNum(v) })} onMax={(v) => set({ potMax: toNum(v) })} />
        <Range title="Yaş" lo={14} hi={50} min={filters.ageMin ?? ''} max={filters.ageMax ?? ''} onMin={(v) => set({ ageMin: toNum(v) })} onMax={(v) => set({ ageMax: toNum(v) })} />
        <Range title="Değer (M€)" lo={0} hi={2000} step="0.1" min={fromEur(filters.valueMin)} max={fromEur(filters.valueMax)} onMin={(v) => set({ valueMin: toEur(v) })} onMax={(v) => set({ valueMax: toEur(v) })} />
      </div>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-1">
        <Toggle text="Bütçeme sığar" checked={filters.budget} onChange={(budget) => set({ budget })} disabledReason={facets !== undefined && !budgetKnown(facets) ? 'Bütçe kayıt dosyasında yok' : undefined} />
        {contractFilterAvailable(facets) && <Toggle text={`Sözleşmesi ≤ ${CONTRACT_MONTHS} ay`} checked={filters.contract} onChange={(contract) => set({ contract })} />}
        {facets?.loanData && <Toggle text="Kiralık" checked={filters.loan} onChange={(loan) => set({ loan })} />}
        <Toggle text="Serbest oyuncu" checked={filters.freeAgent} onChange={(freeAgent) => set({ freeAgent, team: undefined })} />
      </div>
      <details className="text-sm">
        <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent">
          Öznitelik minimumları{Object.keys(filters.attrMin).length > 0 ? ` (${Object.keys(filters.attrMin).length})` : ''}
        </summary>
        <div className="grid grid-cols-2 gap-3 pt-2 min-[820px]:grid-cols-5">
          {ATTR_MIN_KEYS.map((key) => (
            <label key={key} className={label}>
              {ATTR_LABELS[key] ?? key}
              <Input type="number" inputMode="numeric" min={1} max={99} placeholder="En az" aria-label={`${ATTR_LABELS[key] ?? key} en az`} value={filters.attrMin[key] ?? ''}
                onChange={(e) => {
                  const { [key]: _old, ...rest } = filters.attrMin
                  const value = toNum(e.target.value)
                  set({ attrMin: value === undefined ? rest : { ...rest, [key]: value } })
                }} />
            </label>
          ))}
        </div>
      </details>
      <div className={label}>
        <span id={bucketId}>Ulaşılabilirlik</span>
        <div role="group" aria-labelledby={bucketId}className="flex flex-wrap gap-1.5">
          {BUCKETS.map((b) => (
            <Chip key={b.id} pressed={filters.buckets.includes(b.id)} onClick={() => set({ buckets: filters.buckets.includes(b.id) ? filters.buckets.filter((x) => x !== b.id) : [...filters.buckets, b.id] })}>{b.label}</Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
