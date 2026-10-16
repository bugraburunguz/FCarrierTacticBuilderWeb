import { Link } from 'react-router-dom'
import type { CaptureResult } from '../../../api/types'
import { useAuth } from '../../../auth/AuthContext'
import { CaptureOnly } from '../../../components/CaptureOnly'
import { ExtensionSync } from '../../../components/ExtensionSync'
import { ErrorBox, HelpPopover, Select } from '../../../components/ui'
import { PageHeader } from '../../../design/components/PageHeader'
import { Button, Chip, EmptyState, Panel } from '../../../design/components/primitives'
import { extensionCaptureEnabled, harImportEnabled } from '../../../lib/features'
import { CaptureFileImport } from '../../import/CaptureFileImport'
import { HarImport } from '../../import/HarImport'
import { useUtImport } from './useUtImport'

const TOP_CARDS = 25
const TOP_PRICES = 15
const NUM = 'font-[var(--font-num)] tabular-nums'
const coins = (value?: number) => (value === undefined ? '–' : value.toLocaleString('tr-TR'))

function Summary({ result }: { result: CaptureResult }) {
  const s = result.stats
  return (
    <section aria-label="Özet" className="glass flex flex-col gap-2 p-4">
      <h2 className="font-display text-xl font-semibold leading-6">Özet</h2>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="good">{s.processed} işlendi</Chip>
        <Chip>{s.stripped} hesap/oturum yanıtı atıldı</Chip>
        <Chip>{s.ignored} ilgisiz</Chip>
        {s.invalid > 0 && <Chip tone="bad">{s.invalid} okunamadı</Chip>}
        <Chip tone="info">{result.cards.length} kart</Chip>
        {result.coins !== undefined && <Chip tone="info">{coins(result.coins)} coin</Chip>}
      </div>
      {s.definitionsTruncated && <p className="text-sm text-warn">Oyuncu tanım dosyası eksik geldi; yalnız {s.definitionNames} oyuncunun adı çözülebildi. Uzantının güncel sürümüyle yeniden dışa aktar.</p>}
      {s.warnings.map((w) => <p key={w} className="text-xs text-ink-2">{w}</p>)}
    </section>
  )
}

function Club({ result, onPool }: { result: CaptureResult; onPool: () => void }) {
  const top = [...result.cards].sort((a, b) => b.rating - a.rating).slice(0, TOP_CARDS)
  return (
    <Panel title={`Kulüp (${result.cards.length} kart)`} actions={result.cards.length > 0 ? <Button onClick={onPool}>SBC havuzuna aktar</Button> : undefined}>
      {top.length === 0 ? (
        <EmptyState>Kulüp yanıtı yok; uzantı açıkken Kulüp sekmesine gir.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table aria-label="Kulüp kartları" className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs font-medium text-ink-2">
              <tr><th scope="col" className="py-1.5 pr-2">Kart</th><th scope="col" className="pr-2 text-right">OVR</th><th scope="col" className="pr-2">Mevki</th><th scope="col" className="pr-2">Tür</th><th scope="col" className="pr-2 text-right">Son satış</th><th scope="col" className="pr-2 text-right">Piyasa ort.</th><th scope="col"><span className="sr-only">Durum</span></th></tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.instanceId} className="border-t border-[var(--glass-border)]">
                  <td className="py-1.5 pr-2 font-medium">{c.name ?? `#${c.assetId}`}</td>
                  <td className={`pr-2 text-right ${NUM}`}>{c.rating}</td>
                  <td className="pr-2">{c.position}</td>
                  <td className="pr-2 text-ink-2">{c.rarity ?? '–'}</td>
                  <td className={`pr-2 text-right ${NUM}`}>{coins(c.lastSalePrice || undefined)}</td>
                  <td className={`pr-2 text-right ${NUM}`}>{coins(c.marketAverage)}</td>
                  <td className="space-x-1 whitespace-nowrap">{c.untradeable && <Chip>Takas edilemez</Chip>}{c.duplicate && <Chip tone="warn">Kopya</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function Squad({ result }: { result: CaptureResult }) {
  const squad = result.activeSquad
  return (
    <Panel title={`Aktif kadro${squad?.formationLabel ? ` · ${squad.formationLabel}` : ''}`}>
      {!squad ? (
        <EmptyState>Aktif kadro yakalanmadı. Uzantı açıkken Web App'te Kadro ekranını açıp yeniden dışa aktar.</EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm">Kimya <b className={NUM}>{squad.chemistry ?? '–'}</b>{squad.name ? ` · ${squad.name}` : ''}</p>
          <ul className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
            {squad.slots.filter((s) => s.starter).map((s) => (
              <li key={s.index} className="flex justify-between gap-2 border-b border-[var(--glass-border)] py-1">
                <span><span className="inline-block w-10 text-xs font-semibold text-ink-2">{s.position ?? s.index}</span>{s.card?.name ?? (s.card ? `#${s.card.assetId}` : '–')}</span>
                <span className={`text-ink-2 ${NUM}`}>{s.card?.rating ?? '–'} · kimya {s.chemistry ?? '–'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

function Prices({ result }: { result: CaptureResult }) {
  const rows = result.prices.filter((p) => p.buyNow).sort((a, b) => b.rating - a.rating).slice(0, TOP_PRICES)
  if (rows.length === 0) {
    return null
  }
  return (
    <Panel title={<span className="flex items-center gap-1.5">Gördüğün piyasa fiyatları<HelpPopover label="Fiyatlar">Fiyatlar senin oturumunda gördüğün ilanlardır ve platformuna özeldir.</HelpPopover></span>}>
      <ul className="divide-y divide-[var(--glass-border)] text-sm">
        {rows.map((p, i) => (
          <li key={i} className="flex justify-between gap-2 py-1.5">
            <span>{p.name ?? `#${p.assetId}`} <span className="text-xs text-ink-2">{p.rating} · {p.source}</span></span>
            <span className={NUM}>{coins(p.buyNow)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Objectives({ result, modes, mode, onMode, onImport }: { result: CaptureResult; modes: string[]; mode: string; onMode: (m: string) => void; onImport: () => void }) {
  if (result.objectives.length === 0) {
    return null
  }
  return (
    <Panel title={<span className="flex items-center gap-1.5">Objective'ler ({result.objectives.length} grup)<HelpPopover label="Aktarım">Yalnız devam eden ve kilidi açık objective'ler kalan ilerlemeyle aktarılır. Çaba ve "web app'te yapılabilir" işareti adlardan çıkarılan tahmindir; XI şartları otomatik okunmaz.</HelpPopover></span>}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[160px] flex-col gap-1 text-xs font-medium text-muted">Mod
          <Select value={mode} onChange={(e) => onMode(e.target.value)}><option value="">Tümü</option>{modes.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
        </label>
        <Button onClick={onImport}>Planlayıcıya aktar</Button>
      </div>
    </Panel>
  )
}

function Others({ result }: { result: CaptureResult }) {
  return (
    <Panel title="SBC, Evolution ve kaynaklar">
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-ink-2">SBC setleri</dt><dd className={NUM}>{result.sbcSets.length}</dd></div>
        <div><dt className="text-xs text-ink-2">Evolution slotları</dt><dd className={NUM}>{result.evolutions.length}</dd></div>
        <div><dt className="text-xs text-ink-2">EA formasyon tanımı</dt><dd className={NUM}>{result.config.formations.length}</dd></div>
        <div><dt className="text-xs text-ink-2">Kayıtlı kadro</dt><dd className={NUM}>{result.squads.length}</dd></div>
      </dl>
    </Panel>
  )
}

function UnknownPaths({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return null
  }
  return (
    <Panel title={<span className="flex items-center gap-1.5">Henüz işlenmeyen uç noktalar ({paths.length})<HelpPopover label="İşlenmeyen uçlar">Uzantı bu çağrıları gördü ama içeriğini tanımıyoruz. Yalnız yol adlarıdır, içerik yoktur.</HelpPopover></span>}>
      <ul tabIndex={0} aria-label="İşlenmeyen yollar" className="max-h-48 overflow-auto font-[var(--font-num)] text-xs">{paths.map((p) => <li key={p}>{p}</li>)}</ul>
    </Panel>
  )
}

/**
 * v3 Kulüp içe aktar (/ut/import, V3-07c; 11 §9 Akış): uzantı senkronu ve yakalama dosyası (HAR-01 / V3-05c-c ortak akış; HAR yalnız VITE_HAR_IMPORT=on),
 * sonuçlar v3 panellerde. Bayraklar aynı: VITE_EXTENSION_CAPTURE=off iken yalnız kısa not.
 */
export function UtImportV3Page() {
  const { authenticated } = useAuth()
  const { upload, notice, result, modes, mode, setMode, process, toPool, importObjectives } = useUtImport()

  if (!extensionCaptureEnabled()) {
    return <CaptureOnly title="Kulüp içe aktar">{null}</CaptureOnly>
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 py-2">
      <PageHeader title="Kulüp içe aktar" subtitle="Web App'teki kulübünü uzantıyla al; ham dosya sunucuya gitmez, yalnız özet işlenir." />
      {!authenticated ? (
        <EmptyState action={<Link to="/login" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Giriş yap</Link>}>Yakalama dosyasını işlemek için giriş yapmalısın.</EmptyState>
      ) : (
        <>
          {harImportEnabled() && <HarImport busy={upload.isPending} onPersonal={process} />}
          <ExtensionSync busy={upload.isPending} onCaptures={process} />
          <CaptureFileImport source="capture" busy={upload.isPending} onPersonal={process} />
          {upload.isPending && <p role="status" className="text-sm text-ink-2">İşleniyor…</p>}
          <ErrorBox error={upload.error} />
          {notice && <p role="status" className="text-sm text-good">{notice}</p>}
          {result && (
            <>
              <Summary result={result} />
              <Club result={result} onPool={toPool} />
              <Squad result={result} />
              <Prices result={result} />
              <Objectives result={result} modes={modes} mode={mode} onMode={setMode} onImport={importObjectives} />
              <Others result={result} />
              <UnknownPaths paths={result.unknownPaths ?? []} />
            </>
          )}
        </>
      )}
    </div>
  )
}
