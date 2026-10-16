import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CardName } from '../../../components/card/CardName'
import { PlayerCard } from '../../../components/card/PlayerCard'
import { HelpPopover, Input, Select } from '../../../components/ui'
import { MobileSheet, useIsMobile } from '../../../design/components/MobileSheet'
import { Button, Chip, EmptyState, Segmented } from '../../../design/components/primitives'
import { cardPlayerOf } from '../../../lib/cardPlayer'
import type { UtCard } from '../../../lib/utCard'
import { CatalogFiltersButton, CatalogSearch, CatalogShell, MoreFilters, PositionChips } from '../../catalog/CatalogShell'
import { LocalCatalogGrid } from '../../catalog/LocalCatalogGrid'
import { sbcFodder } from '../../sbc/solve/candidates'
import { applyClubFilters, CLUB_DEFAULTS, clubFacets, clubFiltersFromParams, clubFiltersToParams, type ClubFilters, type ClubSort, type TriState } from './clubFilters'
import { SbcPickerDialog } from './SbcPickerDialog'
import { useUtClub } from './useUtClub'

const NUM = 'font-[var(--font-num)] tabular-nums'
const SORTS: { id: ClubSort; label: string }[] = [
  { id: 'rating', label: 'Reyting' },
  { id: 'name', label: 'Ad' },
  { id: 'value', label: 'Değer' },
  { id: 'fodder', label: 'Önce SBC yemi' },
]
const coin = (v?: number) => (v === undefined ? '–' : v.toLocaleString('tr-TR'))
const FODDER_TITLE = { kopya: 'Kopya', 'düşük değer': 'Düşük değer' } as const

function Badges({ c, starter }: { c: UtCard; starter: boolean }) {
  const fodder = sbcFodder(c)
  return (
    <span className="flex flex-wrap justify-center gap-1 pt-2">{/* pt: kartın altına taşan fiyat etiketiyle çakışmasın */}
      {/* Nötr çip + renkli nokta (tonlu çip zemini açık temada cam üstünde 4,5:1'in altına düşüyor; BucketChip ile aynı çözüm). */}
      {fodder && <Chip title={FODDER_TITLE[fodder]}><span aria-hidden="true" className="size-2 rounded-full bg-info" />SBC yemi</Chip>}
      {c.pile === 'storage' && <Chip>Storage</Chip>}
      {c.untradeable && <Chip>Takas edilemez</Chip>}
      {starter && <Chip tone="warn">Aktif kadro</Chip>}
    </span>
  )
}

function FilterFields({ f, set, facets }: { f: ClubFilters; set: (p: Partial<ClubFilters>) => void; facets: ReturnType<typeof clubFacets> }) {
  const label = 'flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-muted'
  const numberOr = (v: string) => (v === '' ? undefined : Number(v))
  const option = (values: string[]) => values.map((v) => <option key={v} value={v}>{v}</option>)
  const tri = (value: TriState, onChange: (v: TriState) => void, yes: string, no: string) => (
    <Select value={value} onChange={(e) => onChange(e.target.value as TriState)}><option value="any">Hepsi</option><option value="yes">{yes}</option><option value="no">{no}</option></Select>
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className={label}>En az reyting<Input type="number" min={40} max={99} inputMode="numeric" value={f.ratingMin ?? ''} onChange={(e) => set({ ratingMin: numberOr(e.target.value) })} /></label>
        <label className={label}>En çok reyting<Input type="number" min={40} max={99} inputMode="numeric" value={f.ratingMax ?? ''} onChange={(e) => set({ ratingMax: numberOr(e.target.value) })} /></label>
        <label className={label}>Nadirlik<Select value={f.rarity ?? ''} onChange={(e) => set({ rarity: e.target.value || undefined })}><option value="">Hepsi</option>{option(facets.rarities)}</Select></label>
        <label className={label}>Lig<Select value={f.league ?? ''} onChange={(e) => set({ league: e.target.value || undefined })}><option value="">Hepsi</option>{option(facets.leagues)}</Select></label>
        <label className={label}>Ülke<Select value={f.nation ?? ''} onChange={(e) => set({ nation: e.target.value || undefined })}><option value="">Hepsi</option>{option(facets.nations)}</Select></label>
        <label className={label}>Kulüp<Select value={f.club ?? ''} onChange={(e) => set({ club: e.target.value || undefined })}><option value="">Hepsi</option>{option(facets.clubs)}</Select></label>
        <label className={label}>Takas edilemez{tri(f.untradeable, (untradeable) => set({ untradeable }), 'Yalnız takas edilemez', 'Yalnız takas edilebilir')}</label>
        <label className={label}>Kopya{tri(f.duplicate, (duplicate) => set({ duplicate }), 'Yalnız kopyalar', 'Kopyasızlar')}</label>
      </div>
      <Segmented label="Yığın" value={f.pile} options={[{ id: 'all', label: 'Hepsi' }, { id: 'club', label: 'Kulüp' }, { id: 'storage', label: 'SBC storage' }]} onChange={(pile) => set({ pile })} />
    </div>
  )
}

/**
 * v3 Kulübüm (/ut/club, V3-07c; 08 §6, 11 §9 Katalog): yapışkan opak süzgeç (mevki, reyting aralığı, nadirlik, lig, ülke, kulüp, takas edilemez,
 * kopya, yığın; sıralama; ızgara/tablo — hepsi adreste), cardGridLayout + VirtualChunk ızgara. "SBC yemi" kuralı candidates.ts'te (değer vekili çözücüyle
 * aynı). Toplu seçim → "Şu SBC'de kullan": set/görev seçilir, çözüm sayfası seçili kartları Özelleştir'de kilitli açar (?kilit=).
 */
export function UtClubV3Page() {
  const [params, setParams] = useSearchParams()
  const f = useMemo(() => clubFiltersFromParams(params), [params])
  const set = (patch: Partial<ClubFilters>) => setParams(clubFiltersToParams({ ...f, ...patch }), { replace: true })
  const { owned, starters, missingPile } = useUtClub()
  const facets = useMemo(() => clubFacets(owned), [owned])
  const rows = useMemo(() => applyClubFilters(owned, f), [owned, f])
  const [selected, setSelected] = useState<string[]>([])
  const [picker, setPicker] = useState(false)
  const [sheet, setSheet] = useState(false)
  const mobile = useIsMobile()
  const isStarter = (c: UtCard) => c.instanceId !== undefined && starters.has(c.instanceId)
  const toggle = (key: string) => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))
  const selectedCards = owned.filter((c) => selected.includes(c.key))
  const issues = selectedCards.filter(isStarter)
  const extra = [f.ratingMin, f.ratingMax, f.rarity, f.league, f.nation, f.club, f.untradeable !== 'any' ? 'x' : undefined, f.duplicate !== 'any' ? 'x' : undefined, f.pile !== 'all' ? 'x' : undefined].filter((v) => v !== undefined).length
  const total = rows.reduce((sum, c) => sum + (c.price ?? 0), 0)

  if (owned.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Kulübüm</h1>
        <EmptyState action={<Link to="/ut/import" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Kulüp içe aktar</Link>}>Henüz kulüp kartı yok. Yakalama dosyanı yükle; tüm oyuncuların ve SBC storage burada listelenir.</EmptyState>
      </div>
    )
  }

  const fields = <FilterFields f={f} set={set} facets={facets} />
  const bar = (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <CatalogSearch value={f.q} onChange={(q) => set({ q })} />
        <label className="flex min-w-[150px] flex-col gap-1 text-xs font-medium text-muted">Sırala
          <Select value={f.sort} onChange={(e) => set({ sort: e.target.value as ClubSort })}>{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
        </label>
        <Segmented label="Görünüm" value={f.view} options={[{ id: 'grid', label: 'Izgara' }, { id: 'table', label: 'Tablo' }]} onChange={(view) => set({ view })} />
        {mobile && <CatalogFiltersButton count={extra} onOpen={() => setSheet(true)} />}
      </div>
      <PositionChips value={f.pos} onChange={(pos) => set({ pos })} />
      {!mobile && <MoreFilters count={extra}>{fields}</MoreFilters>}
    </>
  )

  return (
    <CatalogShell
      title="Kulübüm"
      subtitle={<p className="flex items-center gap-1 text-sm text-ink-2">{owned.length} kulüp kartı<HelpPopover label="SBC yemi ve değer">SBC yemi: kopya kart ya da değeri, çözücünün koruduğu kartların (85+ ya da özel) altında kalan kart; çözücü bu kartları serbestçe kullanır. Değer: pazar ortalaması, yoksa son satış; bilinmiyorsa reytinge göre tahmin (yalnız sıralama).</HelpPopover></p>}
      bar={bar}
    >
      {mobile && sheet && (
        <MobileSheet title="Filtreler" onClose={() => setSheet(false)}>
          <div className="flex flex-col gap-3">
            {fields}
            <div className="flex gap-2"><Button onClick={() => setParams(clubFiltersToParams({ ...CLUB_DEFAULTS, view: f.view, sort: f.sort }), { replace: true })}>Temizle</Button><Button variant="primary" onClick={() => setSheet(false)}>{rows.length} kartı göster</Button></div>
          </div>
        </MobileSheet>
      )}
      {missingPile && <p role="note" className="glass-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-warn">Bu kayıt eski sürümden: storage ve kopya bilgisi yok. Yakalama dosyanı Kulüp içe aktar'dan yeniden yükle.</p>}
      <p role="status" className="text-xs text-muted">{rows.length} kart · değer {coin(total)} coin</p>
      {rows.length === 0 ? (
        <EmptyState action={<Button onClick={() => setParams(clubFiltersToParams({ ...CLUB_DEFAULTS, view: f.view }), { replace: true })}>Süzgeçleri temizle</Button>}>Bu süzgeçlere uyan kart yok.</EmptyState>
      ) : f.view === 'table' ? (
        <div className="glass overflow-x-auto p-2">
          <table aria-label="Kulüp kartları" className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs font-medium text-ink-2">
              <tr>
                <th scope="col" className="w-10 px-2 py-1.5"><span className="sr-only">Seç</span></th>
                <th scope="col" className="px-2">Oyuncu</th><th scope="col" className="px-2 text-right">OVR</th><th scope="col" className="px-2">Mevki</th><th scope="col" className="px-2">Nadirlik</th>
                <th scope="col" className="px-2">Kulüp</th><th scope="col" className="px-2">Lig</th><th scope="col" className="px-2 text-right">Değer</th><th scope="col" className="px-2"><span className="sr-only">Durum</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.key} className="border-t border-[var(--glass-border)]">
                  <td className="px-2"><input type="checkbox" aria-label={`Seç: ${c.name}`} checked={selected.includes(c.key)} onChange={() => toggle(c.key)} className="size-4 accent-[var(--accent)]" /></td>
                  <td className="px-2 py-1.5 font-medium"><CardName assetId={c.assetId} name={c.name} position={c.positions[0]} rating={c.rating} /></td>
                  <td className={`px-2 text-right font-semibold ${NUM}`}>{c.rating}</td>
                  <td className="px-2">{c.positions.slice(0, 3).join(', ')}</td>
                  <td className="px-2 text-ink-2">{c.rarity ?? '–'}</td>
                  <td className="px-2 text-ink-2">{c.club ?? '–'}</td>
                  <td className="px-2 text-ink-2">{c.league ?? '–'}</td>
                  <td className={`px-2 text-right ${NUM}`}>{coin(c.price)}</td>
                  <td className="px-2"><Badges c={c} starter={isStarter(c)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <LocalCatalogGrid items={rows} keyOf={(c) => c.key} renderTile={(c, cardWidth) => (
          <li key={c.key} aria-label={`${c.name}, ${c.rating}`} className={`glass-3 flex min-w-0 flex-col items-center gap-2 px-2 py-3 ${selected.includes(c.key) ? 'ring-2 ring-accent' : ''}`}>
            <PlayerCard player={cardPlayerOf(c, c.positions[0])} width={cardWidth} price={c.price !== undefined ? coin(c.price) : undefined} />
            <Badges c={c} starter={isStarter(c)} />
            {/* Seçim kartın altında kendi satırında: kart katmanı üstte kaldığı için kartın üstüne konan kutu tıklanamıyordu (V3-07c kapısı). */}
            <label className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-2 max-sm:min-h-11">
              <input type="checkbox" aria-label={`Seç: ${c.name}`} checked={selected.includes(c.key)} onChange={() => toggle(c.key)} className="size-4 accent-[var(--accent)]" />
              Seç
            </label>
          </li>
        )} />
      )}
      {selected.length > 0 && (
        <section aria-label="Seçim" className="glass glass-sticky sticky bottom-3 z-20 flex flex-wrap items-center gap-2 p-3 text-sm max-[819px]:bottom-20">
          <b className="mr-auto">{selected.length} kart seçili</b>
          {issues.length > 0 && <p className="w-full text-xs text-warn">{issues.map((c) => `${c.name}: aktif kadronda (çözücü aktif kadroyu kullanmaz)`).join(' · ')}</p>}
          <Button onClick={() => setSelected([])}>Seçimi temizle</Button>
          <Button variant="primary" onClick={() => setPicker(true)}>Şu SBC'de kullan</Button>
        </section>
      )}
      {picker && <SbcPickerDialog keys={selected} onClose={() => setPicker(false)} />}
    </CatalogShell>
  )
}
