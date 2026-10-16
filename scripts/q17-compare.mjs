// q17 sonucunu güncel referansla karşılaştırır (V3-07c): kombinasyon başına saha genişliği, kart genişliği, kart içi en küçük yazı, OVR.
// Referanslar: docs/review/v2/screens/q17-referans/ut.json (V3-05b-c, UT boş + dolu) ve kariyer.json (V3-07b, kariyer boş + dolu; her boyutta yeniden giriş,
// 174/174 geçerli dolu ölçüm). V3-04 kariyer referansının dolu kısmı geçersizdi (oturum süresi; V3-07b raporu) ve artık kullanılmaz.
// Kullanım: node scripts/q17-compare.mjs <q17 çıktısı.json> [<ikinci çıktı.json> ...] [--out karşılaştırma.json]
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : undefined
const inputs = args.filter((a, i) => a !== '--out' && args[i - 1] !== '--out')
if (inputs.length === 0) {
  console.error('Kullanım: node scripts/q17-compare.mjs <q17 çıktısı.json> [...] [--out dosya.json]')
  process.exit(2)
}
const REF = new URL('../docs/review/v2/screens/q17-referans/', import.meta.url)
const load = (p) => JSON.parse(readFileSync(p, 'utf8')).results
const ref = [...load(new URL('ut.json', REF)), ...load(new URL('kariyer.json', REF))]
const key = (r) => [r.mode, r.state, r.size, r.formation].join('|')
const byKey = new Map(ref.map((r) => [key(r), r]))
const FIELDS = ['fieldWidth', 'cardWidth', 'minFont', 'ovrFont']

const groups = {}
for (const r of inputs.flatMap(load)) {
  const g = (groups[`${r.mode}/${r.state}`] ??= { total: 0, problems: 0, validCards: 0, same: 0, missingRef: 0, diff: [] })
  g.total += 1
  g.problems += r.problems.length ? 1 : 0
  g.validCards += r.cardWidth ? 1 : 0
  const p = byKey.get(key(r))
  if (!p) {
    g.missingRef += 1
    continue
  }
  const changed = FIELDS.filter((f) => p[f] !== r[f])
  if (changed.length === 0) {
    g.same += 1
  } else {
    g.diff.push(`${key(r)} ${changed.map((f) => `${f}:${p[f]}→${r[f]}`).join(',')}`)
  }
}
for (const [name, g] of Object.entries(groups)) {
  console.log(`${name}: ${g.total} kombinasyon · sorun ${g.problems} · geçerli kart ${g.validCards} · referansla aynı ${g.same} · fark ${g.diff.length}${g.missingRef ? ` · referansta yok ${g.missingRef}` : ''}`)
  g.diff.slice(0, 5).forEach((d) => console.log(`  ${d}`))
}
if (outFile) {
  writeFileSync(outFile, JSON.stringify(groups, null, 1) + '\n')
}
process.exitCode = Object.values(groups).some((g) => g.problems > 0) ? 1 : 0
