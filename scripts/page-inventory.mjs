// V3-07a sayfa envanteri: App.tsx'teki her rota için v3'te açılan bileşen, eski bileşen kullanımı (doğrudan ve içe aktarma zinciriyle),
// kim görür ve önerilen task. Kodu tarar; elle tablo yok. Tarama kuralları scripts/lib/legacyScan.mjs'te (vitest kapısıyla ortak).
// Çıktı: docs/review/v2/V3-07_envanter.md (+ stdout JSON özet).
// Kullanım: node scripts/page-inventory.mjs            (envanter)
//           node scripts/page-inventory.mjs --file <src altı yol>   (tek dosyanın zinciri; geliştirme yardımı)
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { legacyScanner } from './lib/legacyScan.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const { scan, routes } = legacyScanner(src)

if (process.argv.includes('--file')) {
  const { direct, transitive } = scan(join(src, process.argv[process.argv.indexOf('--file') + 1]))
  console.log(JSON.stringify({ direct, transitive: Object.fromEntries(transitive) }, null, 1))
  process.exit(0)
}

const V307A = new Set(['/', '/login', '/register', '/verify-email', '/privacy', '/career/import', '/career/new', '/profile'])
const V307B = new Set(['/squad/builder', '/squad', '/tactics/wizard', '/teams', '/wonderkids', '/compare', '/ut/squad', '/ut/meta', '/ut/club', '/ut/objectives', '/ut/evo', '/ut/import'])

const rows = routes().map(({ path, element, v3Name, spec, file }) => {
  if (/Navigate to=/.test(element)) {
    return { path, component: `→ ${element.match(/to="([^"]+)"/)?.[1]}`, v3: '—', legacy: '—', who: '—', task: 'kapsam dışı (yönlendirme)' }
  }
  const who = /RequireAuth/.test(element) ? 'giriş' : /CaptureOnly/.test(element) ? 'anonim (yakalama bayrağına bağlı)' : path === '/admin/ut' ? 'admin' : 'anonim'
  if (!file) {
    return { path, component: v3Name ?? '?', v3: '?', legacy: 'dosya bulunamadı', who, task: '?' }
  }
  const { direct, transitive } = scan(file)
  const separateV3 = /isV3\(\)/.test(element) || /^features\//.test(spec) || ['PlayersRoute', 'PlayerDetailRoute'].includes(v3Name)
  const v3 = separateV3 && direct.length === 0 ? 'evet' : separateV3 ? 'kısmen' : 'hayır'
  const legacy = [direct.length ? `doğrudan: ${direct.join(', ')}` : '', transitive.size ? `zincir: ${[...transitive].map(([f, m]) => `${f} (${m.join(', ')})`).join('; ')}` : ''].filter(Boolean).join(' · ') || 'yok'
  const task = v3 === 'evet' && !transitive.size ? 'tamam' : V307A.has(path) ? (v3 === 'evet' ? 'V3-07a (zincirde eski parça)' : 'V3-07a') : V307B.has(path) ? 'V3-07b' : path === '/admin/ut' || path === '/about' ? 'V3-08' : v3 === 'evet' ? 'V3-08 (zincirde eski parça)' : 'V3-07b'
  return { path, component: `${v3Name} (${spec})`, v3, legacy, who, task }
})

const count = (pred) => rows.filter(pred).length
const pages = rows.filter((r) => r.v3 !== '—')
const md = [
  '# V3-07 sayfa envanteri',
  '',
  `Üretim: \`node scripts/page-inventory.mjs\` (kod taraması, ${new Date().toISOString().slice(0, 10)}). Ekran görüntüleri: \`screens/V3-07a/envanter/\` (1280 koyu).`,
  '',
  `Özet: ${rows.length} rota · ${pages.length} sayfa (${count((r) => r.v3 === '—')} yönlendirme) · v3 sayfası ${count((r) => r.v3 === 'evet')} · kısmen ${count((r) => r.v3 === 'kısmen')} · eski ${count((r) => r.v3 === 'hayır')} · eski parçası hiç olmayan ${count((r) => r.legacy === 'yok')}.`,
  '',
  'Sütunlar: **v3** = rotada v3 için ayrı/yeni sayfa ve sayfa dosyasında eski işaret yok (evet), ayrı ama dosyada eski işaret var (kısmen), v2 bileşeni (hayır). **Eski bileşen** = doğrudan sayfa dosyasında ve içe aktarma zincirinde (kabuk hariç) bulunan işaretler: ui.tsx Card/Pill/Modal/Stat, Modal.tsx, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex (kart tasarım config\'i hariç). İçe aktarmalar çözülmüş yola göre tanınır (V3-07b).',
  '',
  '| Rota | v3\'te açılan bileşen | v3 | Eski bileşen | Kim görür | Önerilen task |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| \`${r.path}\` | ${r.component} | ${r.v3} | ${r.legacy} | ${r.who} | ${r.task} |`),
  '',
].join('\n')
writeFileSync(join(root, 'docs/review/v2/V3-07_envanter.md'), md)
console.log(JSON.stringify({ routes: rows.length, v3: count((r) => r.v3 === 'evet'), partial: count((r) => r.v3 === 'kısmen'), legacy: count((r) => r.v3 === 'hayır'), redirects: count((r) => r.v3 === '—'), clean: count((r) => r.legacy === 'yok') }))
