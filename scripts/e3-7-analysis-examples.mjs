// E3-7: 5 örnek taktiğin analiz raporunu `docs/review/v2/E3-7_analiz_ornekleri.md` olarak üretir (yerel yığın, geçici test hesabı; sonunda silinir).
// Her taktik iki kez analiz edilir: (a) yalnız roller (etiketsiz), (b) geçici kariyerin kadrosundan /fit/lineup ile atanan oyuncularla.
// Kullanım: node scripts/e3-7-analysis-examples.mjs [--base http://localhost:8081]
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createGateAccount } from './lib/gateAccount.mjs'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8081'
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('Yalnız localhost/127.0.0.1')
  process.exit(2)
}

await createGateAccount(base, 'gate-')
const login = await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()
const token = login.data.accessToken
const call = async (path, body, method = 'POST') => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: method === 'POST' ? JSON.stringify(body) : undefined })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(`${path} ${res.status} ${JSON.stringify(json).slice(0, 300)}`)
  return json.data
}
const careers = await call('/careers', undefined, 'GET')
const careerId = careers[0].id

const EXAMPLES = [
  { id: 'A', title: '4-2-3-1 (LM-CAM-RM) — örnek taktik (E3-7 tablosundaki)', formation: '4-2-3-1 (2)', buildUp: 'Balanced', depth: 55,
    roles: { LB: 'fullback_defend', RB: 'attacking_wingback_attack', LDM: 'holding_defend', RDM: 'holding_defend', LM: 'inside_forward_attack', CAM: 'playmaker_balanced', RM: 'winger_balanced', ST: 'advanced_forward_attack' } },
  { id: 'B', title: '3-5-2 — kanat bekli (LM/RM = Wide Midfielder Support)', formation: '3-5-2', buildUp: 'Balanced', depth: 60,
    roles: { LM: 'wide_midfielder_support', RM: 'wide_midfielder_support', RDM: 'deep_lying_playmaker_defend', CAM: 'playmaker_attack', RST: 'poacher_attack' } },
  { id: 'C', title: '4-3-3 — Counter, yüksek hat (80)', formation: '4-3-3', buildUp: 'Counter', depth: 80,
    roles: { LB: 'attacking_wingback_attack', RB: 'attacking_wingback_attack', LW: 'inside_forward_attack', RW: 'inside_forward_attack' } },
  { id: 'D', title: '4-4-2 — düz (varsayılan roller)', formation: '4-4-2', buildUp: 'Balanced', depth: 50, roles: {} },
  { id: 'E', title: '4-2-3-1 (LM-CAM-RM) — kötü kurulmuş: iki AWB + çapasız CDM çifti + False 9 + çok yüksek hat + Short', formation: '4-2-3-1 (2)', buildUp: 'Short', depth: 95,
    roles: { LB: 'attacking_wingback_attack', RB: 'attacking_wingback_attack', LDM: 'box_crasher_balanced', RDM: 'box_crasher_balanced', LM: 'winger_attack', RM: 'winger_attack', CAM: 'classic_10_attack', ST: 'false_9_build_up' } },
]

const f = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v))
const OPS = { LT: '<', LTE: '≤', GT: '>', GTE: '≥', EQ: '=' }
const sev = { INFO: 'bilgi', WARN: 'uyarı', RISK: 'risk' }

function metricsTable(m) {
  const o = m.opportunity
  const ch = (c) => `${f(c.volume)}${c.quality === null || c.quality === undefined ? '' : ` / kalite ${f(c.quality)} / skor ${f(c.score)}`}`
  return `| Metrik | Değer |\n|---|---|\n| Bant · hat | ${m.band} · ${m.depth} |\n| Hücum / Savunma | Σr ${f(m.attackDefence.attackLoad)} · Σd ${f(m.attackDefence.defenceLoad)} → hücum %${f(m.attackDefence.attackPct)} |\n| Genişlik | endeks ${f(m.width.index)} · sol ${m.width.left} · sağ ${m.width.right} |\n| Uzunluk | topla ${f(m.length.withBall)} · topsuz ${f(m.length.withoutBall)} → ${f(m.length.value)} |\n| Dayanıklılık | talep ${f(m.stamina.demand)} · arz ${f(m.stamina.supply)} · fark ${f(m.stamina.gap)} |\n| Build-Up | ${m.buildUp.type} · güvenlik ${f(m.buildUp.safety)} · gereken ${f(m.buildUp.required)} · fark ${f(m.buildUp.margin)} |\n| Geri savunma | ${m.restDefence.count} oyuncu (${m.restDefence.slots.join(', ')}) |\n| Fırsat · orta | hacim ${ch(o.cross)} |\n| Fırsat · içe kat | hacim ${ch(o.cutIn)} |\n| Fırsat · arkaya koşu | hacim ${ch(o.runBehind)} |\n| Fırsat · uzaktan şut | hacim ${ch(o.longShot)} |\n`
}

function findingsTable(a) {
  if (a.findings.length === 0) return '_Bulgu yok._\n'
  let md = '| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |\n|---|---|---|---|---|\n'
  for (const x of a.findings) {
    const inst = Object.keys(x.instance).length ? ` [${x.instance.side}]` : ''
    const ev = x.evidence.map((e) => `${e.metric}${e.params.side ? `(${e.params.side})` : e.params.name ? `(${e.params.name})` : ''} = ${f(e.value)} ${OPS[e.op]} ${f(e.threshold)}`).join('<br>')
    md += `| ${x.code}${inst} | ${sev[x.severity]} | ${ev} | ${x.recommendation.text} | ${x.text} |\n`
  }
  return md
}

let md = `# E3-7 — analiz motoru: 5 örnek taktik\n\nMotor: \`POST /tactics/analysis\` (7 metrik + \`seed/tactic-rules.fc27.json\` kuralları). **Etiket yok**: girdi formasyon, rol/focus, build-up, hat; her bulgu kodu, şiddeti, sayısal kanıtı (değer işlem eşik) ve önerisiyle gelir, metin yalnız bu sayılardan üretilir. Eşikler ve rol değerleri \`verified:false\` taslaktır.\n\nHer taktik iki kez analiz edildi: **(a) yalnız roller** ve **(b) oyunculu**: geçici bir katalog kariyerinin kadrosundan \`/fit/lineup\` ile atanan oyuncular (oyuncu attribute'ları gerektiren kurallar yalnız (b)'de değerlendirilir; (a)'da "değerlendirilmedi" olarak listelenir). Oyuncular bu raporun örnek kadrosudur (gerçek kariyer değil).\n\n`
const summary = []
for (const ex of EXAMPLES) {
  const slotsReq = Object.entries(ex.roles).map(([slotId, roleId]) => ({ slotId, roleId }))
  const body = { formation: ex.formation, buildUp: ex.buildUp, depth: ex.depth, slots: slotsReq }
  const a = await call('/tactics/analysis', body)
  const lineup = await call('/fit/lineup', { careerId, tactic: { formation: ex.formation, setup: { buildUp: ex.buildUp, depth: ex.depth }, slots: slotsReq.map((s) => ({ slotId: s.slotId, roleId: s.roleId, tags: [] })) } })
  const assigned = Object.fromEntries(lineup.slots.filter((s) => s.playerId !== undefined && s.playerId !== null).map((s) => [s.slotId, s.playerId]))
  const b = await call('/tactics/analysis', { ...body, careerId, assigned })
  summary.push({ ex, a, b })
  md += `## ${ex.id}. ${ex.title}\n\nFormasyon ${ex.formation} · build-up ${ex.buildUp} · hat ${ex.depth} · roller: ${Object.keys(ex.roles).length ? Object.entries(ex.roles).map(([k, v]) => `${k} ${v}`).join(', ') : 'formasyonun varsayılanları'}\n\n### (a) Yalnız roller\n\n${metricsTable(a.metrics)}\n${findingsTable(a)}\n`
  if (a.notEvaluated.length) md += `\nDeğerlendirilmedi (oyuncu gerekir): ${a.notEvaluated.map((n) => n.code).join(', ')}\n`
  md += `\n### (b) Oyunculu (${Object.keys(assigned).length} slot)\n\n${metricsTable(b.metrics)}\n${findingsTable(b)}\n`
  if (b.notEvaluated.length) md += `\nDeğerlendirilmedi: ${b.notEvaluated.map((n) => n.code).join(', ')}\n`
  md += '\n'
}
md += `## Özet\n\n| Taktik | (a) bulgu | (b) bulgu | Kodlar (b) |\n|---|---|---|---|\n`
for (const { ex, a, b } of summary) md += `| ${ex.id} | ${a.findings.length} | ${b.findings.length} | ${[...new Set(b.findings.map((x) => x.code))].join(', ')} |\n`
writeFileSync(fileURLToPath(new URL('../docs/review/v2/E3-7_analiz_ornekleri.md', import.meta.url)), md)
console.log(summary.map(({ ex, a, b }) => `${ex.id}: a=${a.findings.length} b=${b.findings.length}`).join('\n'))
