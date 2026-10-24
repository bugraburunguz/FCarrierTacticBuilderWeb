// Eski bileşen taraması (V3-07a envanteri, V3-07b kapısı): sayfa dosyası ve içe aktarma zincirinde (kabuk hariç) eski parça işaretleri.
// İşaretler: components/ui'den Card/Pill/Modal/Stat, components/Modal, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex renk
// (kart tasarım config'i — components/card, design/brand, lib/cardDesign.ts — hariç). Envanter betiği ve vitest kapısı ortak kullanır.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const LEGACY_UI_NAMES = ['Card', 'Pill', 'Modal', 'Stat']
const TW_LEGACY = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow)-(?:emerald|teal|slate|sky)-\d{2,3}\b/g
const HEX = /#[0-9a-fA-F]{3,8}\b/g

export function legacyScanner(src) {
  const hexAllowed = [join(src, 'components', 'card'), join(src, 'design', 'brand'), join(src, 'lib', 'cardDesign.ts')]
  /** Göreli içe aktarmayı çözülmüş yola göre tanır (components/ içinden './ui' ya da './Modal' de yakalanır). */
  const importsTo = (file, text, target) => [...text.matchAll(/import\s*(\{[^}]*\}|\w+)?[^'"]*from\s*'(\.[^']+)'/g)]
    .filter((m) => resolve(dirname(file), m[2]) === join(src, target)).map((m) => m[1] ?? '')

  function markersOf(file) {
    const text = readFileSync(file, 'utf8')
    const out = []
    for (const names0 of importsTo(file, text, 'components/ui')) {
      const names = names0.replace(/[{}]/g, '').split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter((n) => LEGACY_UI_NAMES.includes(n))
      if (names.length) out.push(`ui.tsx ${names.join('/')}`)
    }
    if (importsTo(file, text, 'components/Modal').length) out.push('Modal.tsx')
    if (/PitchView/.test(text)) out.push('PitchView')
    if (/matchday\.css/.test(text)) out.push('matchday.css')
    const tw = text.match(TW_LEGACY)
    if (tw) out.push(`tailwind ${[...new Set(tw.map((c) => c.split('-')[1]))].join('/')}`)
    if (!hexAllowed.some((d) => file.startsWith(d))) {
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

  const fileOf = (spec) => ['.tsx', '.ts', '/index.tsx', '/index.ts'].map((ext) => join(src, spec + ext)).find((p) => existsSync(p))

  /** App.tsx rotaları: path, element ifadesi, v3'te açılan bileşen adı ve dosyası. */
  function routes() {
    const app = readFileSync(join(src, 'App.tsx'), 'utf8')
    const lazyFiles = Object.fromEntries([...app.matchAll(/const (\w+) = lazy\(\(\) => import\('\.\/([^']+)'\)/g)].map((m) => [m[1], m[2]]))
    const routeFiles = { PlayersRoute: 'features/careerPlayers/CareerPlayersPage', PlayerDetailRoute: 'features/player/CareerPlayerPage' }
    return [...app.matchAll(/<Route (index|path="([^"]+)") element=\{(.+?)\} \/>/g)].map((m) => {
      const path = m[1] === 'index' ? '/' : `/${m[2]}`
      const element = m[3]
      // v3 dalı yalnız v3'te giriş isteyebilir: `isV3() ? <RequireAuth><Sayfa /></RequireAuth> : …` (FAZ 4b, /career/tactics-lab).
      const v3Name = element.match(/isV3\(\) \? (?:<RequireAuth>)?<(\w+)/)?.[1] ?? element.match(/<(\w+)(?: [^>]*)?\s*\/>/g)?.map((t) => t.match(/<(\w+)/)[1]).filter((n) => !['RequireAuth', 'CaptureOnly'].includes(n)).pop()
      const spec = routeFiles[v3Name] ?? lazyFiles[v3Name]
      return { path, element, v3Name, spec, file: spec && fileOf(spec) }
    })
  }

  return { markersOf, scan, routes }
}
