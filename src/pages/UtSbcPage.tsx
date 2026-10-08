import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { SbcPoolEntry, SbcRarity } from '../api/types'
import { sbcPoolStore } from '../state/sbcPoolStore'
import { TraditionalSbc } from '../components/TraditionalSbc'
import { Button, Card, ErrorBox, Field, Input, Pill, Select } from '../components/ui'
import { isBeforeDailyRefresh } from '../lib/coinPrice'
import { useUtCapture } from '../state/utCaptureStore'

const RARITIES: { id: SbcRarity; label: string }[] = [
  { id: 'REGULAR', label: 'Normal' },
  { id: 'TOTW', label: 'In-Form / TOTW' },
  { id: 'HERO', label: 'Hero' },
  { id: 'ICON', label: 'Icon' },
]

interface Row {
  rating: string
  rarity: SbcRarity
  count: string
  untradeable: boolean
  price: string
}

const emptyRow = (): Row => ({ rating: '80', rarity: 'REGULAR', count: '1', untradeable: true, price: '' })

function daysLeft(endTime?: number): number | undefined {
  // EA kalan süreyi saniye olarak verir; çok büyük değerler "süresiz" demektir.
  if (endTime === undefined) {
    return undefined
  }
  const days = Math.floor(endTime / 86400)
  return days <= 120 ? days : undefined
}

function ClubSbcSets() {
  const capture = useUtCapture()
  const sets = capture?.sbcSets ?? []
  if (sets.length === 0) {
    return (
      <Card title="Kulübündeki SBC'ler">
        <p className="text-sm text-muted">Henüz SBC yakalanmadı. Extension açıkken EA Web App'te SBC sekmesine gir, ardından <a className="underline" href="/ut/import">Kulüp içe aktar</a> sayfasından dosyayı yükle.</p>
      </Card>
    )
  }
  const byCategory = new Map<string, typeof sets>()
  sets.forEach((s) => byCategory.set(s.category ?? 'Diğer', [...(byCategory.get(s.category ?? 'Diğer') ?? []), s]))
  return (
    <Card title={`Kulübündeki SBC'ler (${sets.length})`}>
      {capture && (
        <p className={`mb-2 text-xs ${isBeforeDailyRefresh(capture.importedAt) ? 'text-code' : 'text-muted'}`}>
          Son yakalama: {new Date(capture.importedAt).toLocaleString('tr-TR')}.
          {isBeforeDailyRefresh(capture.importedAt) && ' Yeni SBC\'ler her gün 20:00\'de (TRT) yenilenir; bu liste eski olabilir. Web App\'i açıp yeniden dışa aktar.'}
        </p>
      )}
      <div className="space-y-3">
        {[...byCategory.entries()].map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted">{category}</h3>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {items.map((s) => {
                const left = daysLeft(s.endTime)
                const done = s.challengesCount > 0 && s.challengesCompleted >= s.challengesCount
                return (
                  <li key={s.setId} className="flex items-center justify-between gap-2 border-t border-line py-1">
                    <span className={done ? 'text-muted line-through' : ''}>{s.name ?? `#${s.setId}`}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="tabular-nums">{s.challengesCompleted}/{s.challengesCount}</span>
                      {s.repeatable && <Pill tone="sky">tekrarlanabilir</Pill>}
                      {left !== undefined && <Pill tone="amber">{left} gün</Pill>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Şartlar (min. rating, kimya, lig/ülke) challenge'ın içine girince gelir: SBC setini aç ve her challenge'a tıkla, sonra yeniden dışa aktar. Şart verisi yakalanınca çözücüye aktarılır.</p>
    </Card>
  )
}

export function UtSbcPage() {
  const [target, setTarget] = useState('1000')
  const [minRating, setMinRating] = useState('')
  const [rows, setRows] = useState<Row[]>(() => {
    const stored = sbcPoolStore.get()
    if (stored && stored.length > 0) {
      return stored.map((p) => ({ rating: String(p.rating), rarity: p.rarity, count: String(p.count), untradeable: p.untradeable, price: p.priceEach === undefined ? '' : String(p.priceEach) }))
    }
    return [
    { rating: '80', rarity: 'REGULAR', count: '10', untradeable: true, price: '' },
    { rating: '82', rarity: 'REGULAR', count: '4', untradeable: false, price: '1200' },
    { rating: '84', rarity: 'REGULAR', count: '2', untradeable: false, price: '3500' },
    ]
  })
  const setRow = (index: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const solve = useMutation({
    mutationFn: () => {
      const pool: SbcPoolEntry[] = rows
        .filter((r) => Number(r.count) > 0 && Number(r.rating) >= 45)
        .map((r) => ({
          rating: Number(r.rating),
          rarity: r.rarity,
          count: Number(r.count),
          untradeable: r.untradeable,
          priceEach: !r.untradeable && r.price !== '' ? Number(r.price) : undefined,
        }))
      return endpoints.sbcStreamlined({ targetScore: Number(target), minRating: minRating ? Number(minRating) : undefined, pool })
    },
  })
  const result = solve.data

  return (
    <div className="space-y-4">
      <ClubSbcSets />
      <Card title="SBC çözücü (hedef skor tipi)">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Yeni tip Player/Upgrade SBC'lerde squad kurmazsın, hedef SBC skoruna ulaşırsın. Elindeki kartları rating'e göre gir; çözücü hedefi en az coin harcayarak (önce untradeable) ve en az fazla puanla tutturan seti bulur.
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Hedef SBC skoru">
            <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label="Minimum rating (isteğe bağlı)">
            <Input type="number" min={45} max={99} value={minRating} onChange={(e) => setMinRating(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[80px_150px_80px_130px_120px_auto]">
              <Field label="Rating"><Input type="number" min={45} max={99} value={r.rating} onChange={(e) => setRow(i, { rating: e.target.value })} /></Field>
              <Field label="Tür">
                <Select value={r.rarity} onChange={(e) => setRow(i, { rarity: e.target.value as SbcRarity })}>
                  {RARITIES.map((x) => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Adet"><Input type="number" min={1} value={r.count} onChange={(e) => setRow(i, { count: e.target.value })} /></Field>
              <label className="flex items-center gap-1.5 pb-2 text-sm">
                <input type="checkbox" checked={r.untradeable} onChange={(e) => setRow(i, { untradeable: e.target.checked })} />
                Untradeable
              </label>
              <Field label="Fiyat (coin)">
                <Input type="number" min={0} disabled={r.untradeable} placeholder={r.untradeable ? '0' : 'bilinmiyor'} value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
              </Field>
              <Button variant="ghost" onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}>Sil</Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => setRows((cur) => [...cur, emptyRow()])}>Satır ekle</Button>
          <Button disabled={solve.isPending || rows.length === 0} onClick={() => solve.mutate()}>{solve.isPending ? 'Çözülüyor…' : 'Çöz'}</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Fiyat girilmeyen tradeable kartlar 0 coin sayılır (coinsiz mod: yalnızca fazla puan en aza indirilir). Fiyatlar senin girdiğin değerlerdir; canlı fiyat verisi yoktur. SBC skor tablosu FC27 lansman değerleridir, tam sürümde değişebilir.
        </p>
      </Card>

      {solve.error && <ErrorBox error={solve.error} />}
      <TraditionalSbc />
      {result && (
        <Card title={result.feasible ? 'Çözüm' : 'Çözüm bulunamadı'}>
          {!result.feasible ? (
            <p className="text-sm">{result.note} Havuzun toplam skoru: <b>{result.maxReachableScore}</b>, hedef: <b>{result.targetScore}</b>.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <Pill tone="emerald">{result.totalScore} / {result.targetScore} puan</Pill>
                <Pill tone={result.overshoot === 0 ? 'emerald' : 'amber'}>fazla {result.overshoot}</Pill>
                <Pill tone="sky">{result.itemCount} kart</Pill>
                <Pill tone="slate">{result.totalCost.toLocaleString('tr-TR')} coin</Pill>
                {result.coinless && <Pill tone="amber">coinsiz mod</Pill>}
                {result.approximate && <Pill tone="amber">yaklaşık çözüm</Pill>}
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="py-1 pr-2">Rating</th><th className="pr-2">Tür</th><th className="pr-2 text-right">Adet</th><th className="pr-2 text-right">Puan</th><th className="pr-2 text-right">Coin</th><th /></tr>
                </thead>
                <tbody>
                  {result.picks.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="py-1.5 pr-2 font-semibold">{p.rating}</td>
                      <td className="pr-2">{RARITIES.find((x) => x.id === p.rarity)?.label}</td>
                      <td className="pr-2 text-right tabular-nums">{p.count}</td>
                      <td className="pr-2 text-right tabular-nums">{p.totalScore}</td>
                      <td className="pr-2 text-right tabular-nums">{p.totalCost.toLocaleString('tr-TR')}</td>
                      <td>{p.untradeable && <Pill tone="emerald">untradeable</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.note && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{result.note}</p>}
            </>
          )}
        </Card>
      )}
    </div>
  )
}
