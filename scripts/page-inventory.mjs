// V3-07a sayfa envanteri: App.tsx'teki her rota için v3'te açılan bileşen, eski bileşen kullanımı (doğrudan ve içe aktarma zinciriyle),
// kim görür ve önerilen task. Kodu tarar; elle tablo yok. Çıktı: docs/review/v2/V3-07_envanter.md (+ stdout JSON özet).
// Eski işaretleri: components/ui'den Card/Pill/Modal/Stat, components/Modal, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex renk
// (kart tasarım config'i — components/card ve design/brand — hariç).
// Kullanım: node scripts/page-inventory.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const app = readFileSync(join(src, 'App.tsx'), 'utf8')

// lazy bileşen adı → dosya
const lazyFiles = Object.fromEntries([...app.matchAll(/const (\w+) = lazy\(\(\) => import\('\.\/([^']+)'\)/g)].map((m) => [m[1], m[2]]))
const routeFiles = { PlayersRoute: 'features/careerPlayers/CareerPlayersPage', PlayerDetailRoute: 'features/player/CareerPlayerPage' }
lazyFiles.CardDatabasePage ??= 'features/cards/CardDatabasePage'

const fileOf = (spec) => {
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (existsSync(join(src, spec + ext))) return join(src, spec + ext)
  }
  return undefined
}

const UI_LEGACY = /import\s*\{([^}]*)\}\s*from\s*'[./]*components\/ui'/g
const LEGACY_UI_NAMES = ['Card', 'Pill', 'Modal', 'Stat']
const TW_LEGACY = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow)-(?:emerald|teal|slate|sky)-\d{2,3}\b/g
const HEX = /#[0-9a-fA-F]{3,8}\b/g
const HEX_ALLOWED = [join(src, 'components', 'card'), join(src, 'design', 'brand'), join(src, 'lib', 'cardDesign.ts')]

function markersOf(file) {
  const text = readFileSync(file, 'utf8')
  const out = []
  for (const m of text.matchAll(UI_LEGACY)) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter((n) => LEGACY_UI_NAMES.includes(n))
    if (names.length) out.push(`ui.tsx ${names.join('/')}`)
  }
  if (/from '[./]*components\/Modal'/.test(text)) out.push('Modal.tsx')
  if (/PitchView/.test(text)) out.push('PitchView')
  if (/matchday\.css/.test(text)) out.push('matchday.css')
  const tw = text.match(TW_LEGACY)
  if (tw) out.push(`tailwind ${[...new Set(tw.map((c) => c.split('-')[1]))].join('/')}`)
  if (!HEX_ALLOWED.some((d) => file.startsWith(d))) {
    const hex = (text.match(HEX) ?? []).filter((h) => !/^#\d+$/.test(h) || h.length > 4)
    if (hex.length) out.push('hex')
  }
  return out
}

const importsOf = (file) => [...readFileSync(file, 'utf8').matchAll(/from '(\.[^']+)'/g)].map((m) => resolve(dirname(file), m[1]))
  .map((p) => [p + '.tsx', p + '.ts', p].find((c) => existsSync(c) && /\.(tsx?|css)$/.test(c))).filter(Boolean)
  .filter((p) => !/\/(api|state|auth)\//.test(p) && !p.endsWith('.test.tsx'))

/** Doğrudan dosyanın işaretleri + içe aktarma zincirindeki (UI) dosyaların işaretleri (kabuk AppShell/Layout hariç). */
function scan(entry) {
  const direct = markersOf(entry)
  const seen = new Set([entry])
  const queue = [entry]
  const transitive = new Map()
  while (queue.length) {
    const f = queue.shift()
    for (const dep of importsOf(f)) {
      if (seen.has(dep) || /design\/components\/AppShell|components\/Layout/.test(dep)) continue
      seen.add(dep)
      queue.push(dep)
      const m = markersOf(dep)
      if (m.length) transitive.set(dep.replace(src + '/', ''), m)
    }
  }
  return { direct, transitive }
}

// Rota satırları: path + element ifadesi.
const routes = [...app.matchAll(/<Route (index|path="([^"]+)") element=\{(.+?)\} \/>/g)].map((m) => ({ path: m[1] === 'index' ? '/' : `/${m[2]}`, element: m[3] }))
const V307A = new Set(['/', '/login', '/register', '/verify-email', '/privacy', '/career/import', '/career/new', '/profile'])
const V307B = new Set(['/squad/builder', '/squad', '/tactics/wizard', '/teams', '/wonderkids', '/compare', '/ut/squad', '/ut/meta', '/ut/club', '/ut/objectives', '/ut/evo', '/ut/import'])

const rows = routes.map(({ path, element }) => {
  if (/Navigate to=/.test(element)) {
    return { path, component: `→ ${element.match(/to="([^"]+)"/)?.[1]}`, v3: '—', legacy: '—', who: '—', task: 'kapsam dışı (yönlendirme)' }
  }
  const v3Name = element.match(/isV3\(\) \? <(\w+)/)?.[1] ?? element.match(/<(\w+)(?: [^>]*)?\s*\/>/g)?.map((t) => t.match(/<(\w+)/)[1]).filter((n) => !['RequireAuth', 'CaptureOnly'].includes(n)).pop()
  const spec = routeFiles[v3Name] ?? lazyFiles[v3Name]
  const file = spec && fileOf(spec)
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
  'Sütunlar: **v3** = rotada v3 için ayrı/yeni sayfa ve sayfa dosyasında eski işaret yok (evet), ayrı ama dosyada eski işaret var (kısmen), v2 bileşeni (hayır). **Eski bileşen** = doğrudan sayfa dosyasında ve içe aktarma zincirinde (kabuk hariç) bulunan işaretler: ui.tsx Card/Pill/Modal/Stat, Modal.tsx, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex (kart tasarım config\'i hariç).',
  '',
  '| Rota | v3\'te açılan bileşen | v3 | Eski bileşen | Kim görür | Önerilen task |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| \`${r.path}\` | ${r.component} | ${r.v3} | ${r.legacy} | ${r.who} | ${r.task} |`),
  '',
].join('\n')
writeFileSync(join(root, 'docs/review/v2/V3-07_envanter.md'), md)
console.log(JSON.stringify({ routes: rows.length, v3: count((r) => r.v3 === 'evet'), partial: count((r) => r.v3 === 'kısmen'), legacy: count((r) => r.v3 === 'hayır'), redirects: count((r) => r.v3 === '—'), clean: count((r) => r.legacy === 'yok') }))
