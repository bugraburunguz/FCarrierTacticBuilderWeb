import { AlertTriangle, ArrowLeftRight, ArrowRight, BarChart3, Gift, Layers, LayoutDashboard, ShieldCheck, Upload, UserPlus, Workflow, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'

const PRIMARY = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-5 font-display text-lg font-semibold uppercase tracking-wide text-on-accent hover:opacity-90'
const SECONDARY = 'glass-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 font-display text-lg font-semibold uppercase tracking-wide text-ink hover:bg-[var(--glass-hover)]'
const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.08em] text-accent'

/** Önizleme sahası: kurgusal oyuncular (gerçek kişi ve kulüp yok), 4-3-3; ortak saha bileşeni. */
const PREVIEW: PitchSlot[] = [
  { slotId: 'GK', position: 'GK', x: 50, y: 90, player: { name: 'Deniz Kaya', rating: 74 } },
  { slotId: 'LB', position: 'LB', x: 14, y: 70, player: { name: 'Arda Yılmaz', rating: 72 } },
  { slotId: 'LCB', position: 'CB', x: 37, y: 75, player: { name: 'Mert Aksoy', rating: 77 } },
  { slotId: 'RCB', position: 'CB', x: 63, y: 75, player: { name: 'Kerem Uslu', rating: 75 } },
  { slotId: 'RB', position: 'RB', x: 86, y: 70, player: { name: 'Ozan Er', rating: 66 } },
  { slotId: 'LCM', position: 'CM', x: 28, y: 48, player: { name: 'Emre Tan', rating: 78 } },
  { slotId: 'CDM', position: 'CDM', x: 50, y: 55, player: { name: 'Burak Oral', rating: 80 } },
  { slotId: 'RCM', position: 'CM', x: 72, y: 48, player: { name: 'Can Sezer', rating: 76 } },
  { slotId: 'LW', position: 'LW', x: 16, y: 22, player: { name: 'Efe Kılıç', rating: 79 } },
  { slotId: 'ST', position: 'ST', x: 50, y: 14, player: { name: 'Umut Demir', rating: 82 } },
  { slotId: 'RW', position: 'RW', x: 84, y: 22, player: { name: 'Sinan Ateş', rating: 77 } },
]

function Feature({ icon: Icon, title, tag, children }: { icon: LucideIcon; title: string; tag: string; children: ReactNode }) {
  return (
    <article className="glass-2 flex flex-col gap-3 p-4 sm:p-5">
      <span aria-hidden="true" className="glass-3 grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-accent"><Icon size={20} /></span>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold uppercase leading-7">{title}</h3>
        <span className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink">{tag}</span>
      </div>
      <p className="text-sm text-ink-2">{children}</p>
    </article>
  )
}

function Step({ n, icon: Icon, title, children }: { n: number; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="glass-2 flex flex-col gap-2 p-4 sm:p-5">
      <span className="flex items-center justify-between">
        <span className="font-display text-3xl font-bold tabular-nums text-accent">{String(n).padStart(2, '0')}</span>
        <Icon size={20} aria-hidden="true" className="text-ink-2" />
      </span>
      <h3 className="font-display text-xl font-semibold uppercase">{title}</h3>
      <p className="text-sm text-ink-2">{children}</p>
    </li>
  )
}

function Reason({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="glass-3 flex gap-3 p-3">
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
      <div>
        <h3 className="font-display text-lg font-semibold uppercase leading-6">{title}</h3>
        <p className="text-sm text-ink-2">{children}</p>
      </div>
    </div>
  )
}

/**
 * FCA-26 ziyaretçi karşılama sayfası (Stitch "Karşılama"): giriş yapmamış ziyaretçiye `/` adresinde. Hero + taktik tahtası önizlemesi, üç özellik,
 * Nasıl çalışır, neden FC Assist. Uydurma kullanıcı sayısı, sürüm ya da resmi logo yok; oyuncular kurgusal. Herkese açık sayfa: kullanıcının temasında.
 */
export function Landing() {
  const ids = { features: useId(), how: useId(), why: useId() }
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 py-4 sm:gap-14 sm:py-8">
      <section aria-label="Tanıtım" className="grid grid-cols-1 items-center gap-8 min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <p className={EYEBROW}>Kariyer modu asistanı · Ücretsiz beta</p>
          <h1 className="font-display text-[44px] font-bold uppercase leading-[1] tracking-[0.01em] sm:text-[64px]">
            Kariyerinde <span className="text-accent">yanında.</span>
          </h1>
          <p className="max-w-xl text-base text-ink-2">
            Kadronun taktiğe uyumunu, zayıf halkaları ve bütçene uygun transferleri tek yerde gör. Live Editor kaydını yükle, masan hazır olsun.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className={PRIMARY}>Ücretsiz başla<ArrowRight size={18} aria-hidden="true" /></Link>
            <a href="#nasil-calisir" className={SECONDARY}>Nasıl çalışır?</a>
          </div>
          <p className="text-sm text-ink-2">
            Hesabın var mı? <Link to="/login" className="inline-flex min-h-10 items-center font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">Giriş yap</Link>
          </p>
        </div>
        <section aria-label="Taktik tahtası önizlemesi" className="glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-xl font-semibold uppercase text-accent">Taktik tahtası <span className="ml-1 text-sm text-ink-2">4-3-3 Hücum</span></p>
            <span className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-ink">Taktik uyumu %82</span>
          </header>
          <div className="mx-auto w-full max-w-[420px]">
            <Pitch slots={PREVIEW} onPickPlayer={() => undefined} readOnly marker="pawn" />
          </div>
          <p className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--warn-soft)] px-3 py-2 text-sm text-ink">
            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />
            <span><b>Zayıf halka:</b> sağ bek rolüne yetmiyor. Bütçene uygun üç aday hazır.</span>
          </p>
          <p className="text-xs text-muted">Örnek görünüm; oyuncular kurgusal.</p>
        </section>
      </section>

      <section aria-labelledby={ids.features} className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <p className={EYEBROW}>Analitik üstünlük</p>
          <h2 id={ids.features} className="font-display text-3xl font-bold uppercase leading-8">Kariyer modunu veriyle yönet</h2>
        </header>
        <div role="region" aria-label="Özellikler" className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
          <Feature icon={Upload} title="Kaydını yükle" tag="Live Editor">Live Editor kaydından kadro, sözleşme, form ve bütçe birkaç saniyede içeri gelir; elle veri girişi yok.</Feature>
          <Feature icon={Workflow} title="Taktiğini kur" tag="Rol uyumu">Dizilişini kur ya da ünlü takımların replikalarını kullan; her oyuncunun rolüne uyumunu ve zayıf halkaları gör.</Feature>
          <Feature icon={ArrowLeftRight} title="Doğru transferi bul" tag="Bütçe">Bütçene ve taktiğine uyan adayları, satış ve kiralık önerilerini, gençlerin gelişim planını tek yerde bul.</Feature>
        </div>
      </section>

      <section id="nasil-calisir" aria-label="Nasıl çalışır?" className="flex scroll-mt-20 flex-col gap-4">
        <header className="flex flex-col gap-1">
          <p className={EYEBROW}>Basit kurulum</p>
          <h2 id={ids.how} className="font-display text-3xl font-bold uppercase leading-8">Nasıl çalışır?</h2>
        </header>
        <ol className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
          <Step n={1} icon={UserPlus} title="Kayıt ol">E-postanla ücretsiz hesap aç ve e-postanı doğrula.</Step>
          <Step n={2} icon={Upload} title="Kaydını yükle">Oyunda Live Editor betiğini çalıştır, çıkan dosyayı sürükle bırak.</Step>
          <Step n={3} icon={LayoutDashboard} title="Masan hazır">Kadro uyumu, gelişim planları, transfer adayları ve maç planı önünde.</Step>
        </ol>
      </section>

      <section aria-labelledby={ids.why} className="glass-2 grid grid-cols-1 gap-6 p-4 sm:p-6 min-[1024px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>Neden FC Assist?</p>
          <h2 id={ids.why} className="font-display text-3xl font-bold uppercase leading-8">Taraftar elinden, menajer için</h2>
          <p className="text-sm text-ink-2">Bağımsız hayran projesi; EA ile bağlantısı yoktur. Oyunun menülerinde aradığını bulamadığın bilgiyi kendi kaydından çıkarır.</p>
          <Link to="/register" className={`${PRIMARY} self-start`}>Ücretsiz katıl<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
          <Reason icon={Gift} title="Beta'da ücretsiz">Beta süresince bütün özellikler açık.</Reason>
          <Reason icon={BarChart3} title="Kendi kaydın">Analiz senin kariyerinin verisiyle yapılır, genel listelerle değil.</Reason>
          <Reason icon={ShieldCheck} title="Bağımsız">Resmi ürün değil; EA, kulüp ya da lig logosu kullanılmaz.</Reason>
          <Reason icon={Layers} title="UT araçları da var">
            <Link to="/players" className="inline-flex min-h-10 items-center font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">UT araçları: kart veritabanı, kadro kurucu, meta</Link>
          </Reason>
        </div>
      </section>
    </div>
  )
}
