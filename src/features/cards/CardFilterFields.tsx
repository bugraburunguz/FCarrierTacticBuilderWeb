import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import { Input, Select } from '../../components/ui'
import type { CardFilters } from './cardFilters'

const STALE_MS = 300_000
const label = 'flex flex-col gap-1 text-xs font-medium text-muted'
const toNum = (value: string): number | undefined => (value === '' ? undefined : Number(value))

/** Gelişmiş süzgeçler (lig, uyruk, OVR aralığı, zayıf ayak, hareket, ayak, futbol): masaüstünde çubukta, mobilde "Filtreler" sheet'inde aynı bileşen. */
export function CardFilterFields({ filters, set }: { filters: CardFilters; set: (patch: Partial<CardFilters>) => void }) {
  const leagues = useQuery({ queryKey: ['leagues', filters.gender], queryFn: () => endpoints.leagues(filters.gender), staleTime: STALE_MS })
  const nationalities = useQuery({ queryKey: ['nationalities'], queryFn: endpoints.nationalities, staleTime: STALE_MS })
  return (
    <div className="grid grid-cols-2 gap-3 min-[820px]:grid-cols-4">
      <label className={label}>
        Futbol
        <Select value={String(filters.gender)} onChange={(e) => set({ gender: e.target.value === '1' ? 1 : 0, league: undefined, nat: undefined })}>
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
      <label className={label}>
        OVR en az
        <Input type="number" inputMode="numeric" min={1} max={99} value={filters.ovrMin ?? ''} onChange={(e) => set({ ovrMin: toNum(e.target.value) })} />
      </label>
      <label className={label}>
        OVR en çok
        <Input type="number" inputMode="numeric" min={1} max={99} value={filters.ovrMax ?? ''} onChange={(e) => set({ ovrMax: toNum(e.target.value) })} />
      </label>
      <label className={label}>
        Zayıf ayak en az
        <Select value={filters.wfMin ?? ''} onChange={(e) => set({ wfMin: toNum(e.target.value) })}>
          <option value="">Hepsi</option>
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}★</option>
          ))}
        </Select>
      </label>
      <label className={label}>
        Hareket en az
        <Select value={filters.smMin ?? ''} onChange={(e) => set({ smMin: toNum(e.target.value) })}>
          <option value="">Hepsi</option>
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}★</option>
          ))}
        </Select>
      </label>
    </div>
  )
}
