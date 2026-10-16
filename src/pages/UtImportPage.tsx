import type { CaptureResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ExtensionSync } from '../components/ExtensionSync'
import { CaptureFileImport } from '../features/import/CaptureFileImport'
import { HarImport } from '../features/import/HarImport'
import { CaptureOnly } from '../components/CaptureOnly'
import { extensionCaptureEnabled, harImportEnabled } from '../lib/features'
import { Button, Card, EmptyState, ErrorBox, Pill } from '../components/ui'
import { useUtImport } from '../features/ut/import/useUtImport'

const TOP_CARDS = 25
const TOP_PRICES = 15

function coins(value?: number) {
  return value === undefined ? '—' : value.toLocaleString('tr-TR')
}

/** v2 kulüp içe aktar (v3: features/ut/import/UtImportV3Page). Akış useUtImport'ta. */
export function UtImportPage() {
  const { authenticated } = useAuth()
  const { upload, notice, result, modes, mode, setMode, process, toPool, importObjectives } = useUtImport()

  // V3-06a: uzantı senkronu + yakalama dosyası VITE_EXTENSION_CAPTURE ile (varsayılan açık); HAR bölümü VITE_HAR_IMPORT ile (varsayılan kapalı).
  if (!extensionCaptureEnabled()) {
    return <CaptureOnly title="Kulüp içe aktar">{null}</CaptureOnly>
  }

  if (!authenticated) {
    return <Card><EmptyState>Yakalama dosyasını işlemek için giriş yapmalısın.</EmptyState></Card>
  }

  return (
    <div className="space-y-4">
      {harImportEnabled() && <HarImport busy={upload.isPending} onPersonal={process} />}
      <ExtensionSync busy={upload.isPending} onCaptures={process} />
      {/* V3-05c-c: uzantının dışa aktardığı dosya HAR-01 ile aynı akıştan geçer (hedef → özet → onay); ham dosya sunucuya gitmez. */}
      <CaptureFileImport source="capture" busy={upload.isPending} onPersonal={process} />
      {upload.isPending && <p role="status" className="text-sm text-muted">İşleniyor…</p>}
      <ErrorBox error={upload.error} />

      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
      {result && (
        <>
          <Summary result={result} />
          <Club result={result} onPool={toPool} />
          <Squad result={result} />
          <Prices result={result} />
          <Objectives
            result={result}
            modes={modes}
            mode={mode}
            onMode={setMode}
            onImport={importObjectives}
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
        <p className="mt-2 text-sm text-code">
          Oyuncu tanım dosyası (players.json) eksik geldi; yalnızca {s.definitionNames} oyuncunun adı çözülebildi. Extension'ın güncel sürümüyle yeniden dışa aktar.
        </p>
      )}
      {s.warnings.map((w) => <p key={w} className="mt-1 text-xs text-code">{w}</p>)}
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
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-1 pr-2">Kart</th><th className="pr-2 text-right">OVR</th><th className="pr-2">Mevki</th><th className="pr-2">Tür</th><th className="pr-2 text-right">Son satış</th><th className="pr-2 text-right">Piyasa ort.</th><th /></tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.instanceId} className="border-t border-line">
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
            <span><span className="inline-block w-10 text-xs font-semibold text-muted">{s.position ?? s.index}</span>{s.card?.name ?? (s.card ? `#${s.card.assetId}` : '—')}</span>
            <span className="tabular-nums text-muted">{s.card?.rating} · k{s.chemistry ?? '—'}</span>
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
          <li key={i} className="flex justify-between border-t border-line py-1 first:border-0">
            <span>{p.name ?? `#${p.assetId}`} <span className="text-xs text-muted">{p.rating} · {p.source}</span></span>
            <span className="tabular-nums">{coins(p.buyNow)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Fiyatlar senin oturumunda gördüğün ilanlardır ve platformuna özeldir.</p>
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
          <select value={mode} onChange={(e) => onMode(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1">
            <option value="">Tümü</option>
            {modes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <Button variant="secondary" onClick={onImport}>Planlayıcıya aktar</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Yalnızca devam eden ve kilidi açık objective'ler, kalan ilerlemeyle aktarılır. Çaba ve "web app'te yapılabilir" işareti adlardan çıkarılan tahmindir; XI şartları otomatik okunmaz.</p>
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
      <p className="mt-2 text-xs text-muted">SBC gereksinim ayrıntıları için extension açıkken ilgili SBC'lere tıkla ve yeniden dışa aktar.</p>
    </Card>
  )
}
