import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { CaptureResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, EmptyState, ErrorBox, Pill } from '../components/ui'
import { toPlannerObjectives, toSbcPool } from '../lib/capture'
import { objectiveStore } from '../state/objectiveStore'
import { fromCapture, cardPrice, type UtCard } from '../lib/utCard'
import { sbcPoolStore } from '../state/sbcPoolStore'
import { utCardStore } from '../state/utCardStore'
import { utCaptureStore } from '../state/utCaptureStore'

const TOP_CARDS = 25
const TOP_PRICES = 15

function parseCaptures(text: string): unknown[] {
  const parsed = JSON.parse(text) as unknown
  if (Array.isArray(parsed)) {
    return parsed
  }
  const captures = (parsed as { captures?: unknown }).captures
  if (Array.isArray(captures)) {
    return captures
  }
  throw new Error('Dosya bir yakalama listesi değil.')
}

function toLibrary(result: CaptureResult): UtCard[] {
  const own = result.cards.map((c) => fromCapture(c, 'club', cardPrice(c)))
  const listings = result.prices.flatMap((p, i) => (p.card ? [fromCapture(p.card, 'market', p.buyNow ?? p.currentBid ?? p.startingBid, `-${i}`)] : []))
  return [...own, ...listings]
}

function coins(value?: number) {
  return value === undefined ? '—' : value.toLocaleString('tr-TR')
}

export function UtImportPage() {
  const { authenticated } = useAuth()
  const navigate = useNavigate()
  const [fileError, setFileError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const upload = useMutation({
    mutationFn: async (file: File) => endpoints.utCapture(parseCaptures(await file.text())),
    onSuccess: (data) => {
      const saved = utCardStore.set(toLibrary(data))
      utCaptureStore.set(data)
      setNotice(saved ? 'Kulüp kartların ve gördüğün market ilanları kadro kurucuda kullanılabilir.' : 'Kartlar tarayıcıda saklanamadı (alan dolu).')
    },
    onError: (e) => setFileError(e instanceof SyntaxError ? 'Dosya geçerli bir JSON değil.' : undefined),
  })
  const result = upload.data
  const modes = useMemo(() => [...new Set((result?.objectives ?? []).map((g) => g.gameMode).filter(Boolean))] as string[], [result])
  const [mode, setMode] = useState('CLUB')

  if (!authenticated) {
    return <Card><EmptyState>Yakalama dosyasını işlemek için giriş yapmalısın.</EmptyState></Card>
  }

  return (
    <div className="space-y-4">
      <Card title="Kulüp ve piyasa verisi içe aktar">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Extension'ın dışa aktardığı <span className="font-mono">fcareer-captures.json</span> dosyasını yükle. Sunucu yalnızca kulüp, kadro, piyasa, objective, SBC, Evo ve kaynak (config) yanıtlarını işler; oturum ve hesap uçlarını yoksayar. Kartlar, SBC setleri, Evo slotları ve aktif kadro tarayıcında saklanır; sunucuya kaydedilmez.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          aria-label="Yakalama dosyası"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setFileError(undefined)
              setNotice(undefined)
              upload.mutate(file)
            }
          }}
        />
        {upload.isPending && <p className="mt-2 text-sm text-slate-500">İşleniyor…</p>}
        {fileError && <p role="alert" className="mt-2 text-sm text-rose-600">{fileError}</p>}
        {!fileError && <ErrorBox error={upload.error} />}
        <p className="mt-2 text-xs text-slate-500">Dosya hesap bilgisi ve coin bakiyen gibi hassas veri içerebilir; paylaşma, işin bitince sil.</p>
      </Card>

      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {result && (
        <>
          <Summary result={result} />
          <Club result={result} onPool={() => {
            sbcPoolStore.set(toSbcPool(result.cards))
            navigate('/ut/sbc')
          }} />
          <Squad result={result} />
          <Prices result={result} />
          <Objectives
            result={result}
            modes={modes}
            mode={mode}
            onMode={setMode}
            onImport={() => {
              const objectives = toPlannerObjectives(result.objectives, { gameModes: mode ? [mode] : undefined })
              objectives.forEach((o) => objectiveStore.add(o))
              setNotice(`${objectives.length} objective planlayıcıya eklendi.`)
            }}
          />
          <Others result={result} />
          <UnknownPaths paths={result.unknownPaths ?? []} />
        </>
      )}
    </div>
  )
}

function Summary({ result }: { result: CaptureResult }) {
  const s = result.stats
  return (
    <Card title="Özet">
      <div className="flex flex-wrap gap-2 text-sm">
        <Pill tone="emerald">{s.processed} işlendi</Pill>
        <Pill tone="amber">{s.stripped} hesap/oturum yanıtı atıldı</Pill>
        <Pill tone="slate">{s.ignored} ilgisiz</Pill>
        {s.invalid > 0 && <Pill tone="rose">{s.invalid} okunamadı</Pill>}
        <Pill tone="sky">{result.cards.length} kart</Pill>
        {result.coins !== undefined && <Pill tone="sky">{coins(result.coins)} coin</Pill>}
      </div>
      {s.definitionsTruncated && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          Oyuncu tanım dosyası (players.json) eksik geldi; yalnızca {s.definitionNames} oyuncunun adı çözülebildi. Extension'ın güncel sürümüyle yeniden dışa aktar.
        </p>
      )}
      {s.warnings.map((w) => <p key={w} className="mt-1 text-xs text-amber-700">{w}</p>)}
    </Card>
  )
}

function Club({ result, onPool }: { result: CaptureResult; onPool: () => void }) {
  const top = [...result.cards].sort((a, b) => b.rating - a.rating).slice(0, TOP_CARDS)
  return (
    <Card title={`Kulüp (${result.cards.length} kart)`} actions={result.cards.length > 0 ? <Button variant="secondary" onClick={onPool}>SBC havuzuna aktar</Button> : undefined}>
      {top.length === 0 ? (
        <EmptyState>Kulüp yanıtı bulunamadı; extension açıkken Kulüp sekmesine gir.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-1 pr-2">Kart</th><th className="pr-2 text-right">OVR</th><th className="pr-2">Mevki</th><th className="pr-2">Tür</th><th className="pr-2 text-right">Son satış</th><th className="pr-2 text-right">Piyasa ort.</th><th /></tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.instanceId} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="py-1.5 pr-2 font-medium">{c.name ?? `#${c.assetId}`}</td>
                  <td className="pr-2 text-right tabular-nums">{c.rating}</td>
                  <td className="pr-2">{c.position}</td>
                  <td className="pr-2">{c.rarity ?? '—'}</td>
                  <td className="pr-2 text-right tabular-nums">{coins(c.lastSalePrice || undefined)}</td>
                  <td className="pr-2 text-right tabular-nums">{coins(c.marketAverage)}</td>
                  <td>{c.untradeable && <Pill tone="emerald">untradeable</Pill>}{c.duplicate && <Pill tone="amber">duplicate</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function UnknownPaths({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return null
  }
  return (
    <Card title={`Henüz işlenmeyen uç noktalar (${paths.length})`}>
      <p className="mb-2 text-xs text-muted">Extension bu çağrıları gördü ama içeriği tanımıyoruz (aktif kadro/taktik, SBC challenge ayrıntıları gibi eksikler genelde burada görünür). Yalnızca yol adlarıdır, içerik yoktur.</p>
      <ul className="max-h-48 overflow-auto font-mono text-xs">
        {paths.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  )
}

function Squad({ result }: { result: CaptureResult }) {
  const squad = result.activeSquad
  if (!squad) {
    return (
      <Card title="Aktif kadro">
        <EmptyState>Aktif kadro yakalanmadı. Extension açıkken EA Web App'te Kadro (Squad) ekranını aç, sayfayı yenile ve yeniden dışa aktar.</EmptyState>
      </Card>
    )
  }
  return (
    <Card title={`Aktif kadro ${squad.formationLabel ? `· ${squad.formationLabel}` : ''}`}>
      <p className="mb-2 text-sm">Kimya: <b>{squad.chemistry ?? '—'}</b>{squad.name ? ` · ${squad.name}` : ''}</p>
      <ul className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
        {squad.slots.filter((s) => s.starter).map((s) => (
          <li key={s.index} className="flex justify-between gap-2">
            <span><span className="inline-block w-10 text-xs font-semibold text-slate-500">{s.position ?? s.index}</span>{s.card?.name ?? (s.card ? `#${s.card.assetId}` : '—')}</span>
            <span className="tabular-nums text-slate-500">{s.card?.rating} · k{s.chemistry ?? '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Prices({ result }: { result: CaptureResult }) {
  const rows = result.prices.filter((p) => p.buyNow).sort((a, b) => b.rating - a.rating).slice(0, TOP_PRICES)
  if (rows.length === 0) {
    return null
  }
  return (
    <Card title="Gördüğün piyasa fiyatları">
      <ul className="text-sm">
        {rows.map((p, i) => (
          <li key={i} className="flex justify-between border-t border-slate-100 py-1 first:border-0 dark:border-slate-700">
            <span>{p.name ?? `#${p.assetId}`} <span className="text-xs text-slate-500">{p.rating} · {p.source}</span></span>
            <span className="tabular-nums">{coins(p.buyNow)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Fiyatlar senin oturumunda gördüğün ilanlardır ve platformuna özeldir.</p>
    </Card>
  )
}

function Objectives({ result, modes, mode, onMode, onImport }: { result: CaptureResult; modes: string[]; mode: string; onMode: (m: string) => void; onImport: () => void }) {
  if (result.objectives.length === 0) {
    return null
  }
  return (
    <Card title={`Objective'ler (${result.objectives.length} grup)`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5">
          Mod
          <select value={mode} onChange={(e) => onMode(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900">
            <option value="">Tümü</option>
            {modes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <Button variant="secondary" onClick={onImport}>Planlayıcıya aktar</Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Yalnızca devam eden ve kilidi açık objective'ler, kalan ilerlemeyle aktarılır. Çaba ve "web app'te yapılabilir" işareti adlardan çıkarılan tahmindir; XI şartları otomatik okunmaz.</p>
    </Card>
  )
}

function Others({ result }: { result: CaptureResult }) {
  return (
    <Card title="SBC, Evolution ve kaynaklar">
      <ul className="space-y-1 text-sm">
        <li>SBC setleri: <b>{result.sbcSets.length}</b>{result.sbcSets.length > 0 && ` (${result.sbcSets.slice(0, 4).map((s) => s.name).join(', ')}…)`}</li>
        <li>Evolution slotları: <b>{result.evolutions.length}</b></li>
        <li>EA formasyon tanımı: <b>{result.config.formations.length}</b></li>
        {result.squads.length > 0 && <li>Kayıtlı kadro: <b>{result.squads.length}</b></li>}
      </ul>
      <p className="mt-2 text-xs text-slate-500">SBC gereksinim ayrıntıları için extension açıkken ilgili SBC'lere tıkla ve yeniden dışa aktar.</p>
    </Card>
  )
}
