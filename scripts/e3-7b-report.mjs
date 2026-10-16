// E3-7b kalibrasyon raporu: negatif set (8 meta formasyon), 5 örnek önce/sonra ve iki bağlamda (Crewe / dev kulüp) aynı taktiğin bulguları.
// Kullanım: node scripts/e3-7b-report.mjs <iki-baglam.md>   (iki bağlam dosyası: backend TacticCalibrationReportRunner çıktısı)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createGateAccount } from './lib/gateAccount.mjs'

const base = 'http://localhost:8081'
const twoContext = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : '_iki bağlam dosyası verilmedi_'
await createGateAccount(base, 'gate-')
const login = await (await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.GATE_EMAIL, password: process.env.GATE_PASSWORD }) })).json()
const token = login.data.accessToken
const call = async (body) => {
  const res = await fetch(`${base}/api/v1/tactics/analysis`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 200)}`)
  return json.data
}

// Önce: E3-7 raporu (kalibrasyon öncesi) ve ilk negatif set koşusu (HealthyTacticsNoWarningsTest kırmızı çıktısı)
const NEG_BEFORE = { '4-3-3': [], '4-2-3-1': ['midfield_outnumbered'], '4-2-1-3': ['midfield_outnumbered'], '3-5-2': ['midfield_outnumbered'], '4-1-2-1-2': [], '4-4-2': ['midfield_outnumbered', 'no_anchor'], '4-3-2-1': ['no_anchor'], '5-2-1-2': ['midfield_outnumbered', 'no_anchor'] }
const EX_BEFORE = { A: [3, 3], B: [1, 1], C: [0, 3], D: [2, 3], E: [6, 10] }
const EXAMPLES = [
  { id: 'A', formation: '4-2-3-1 (2)', buildUp: 'Balanced', depth: 55, roles: { LB: 'fullback_defend', RB: 'attacking_wingback_attack', LDM: 'holding_defend', RDM: 'holding_defend', LM: 'inside_forward_attack', CAM: 'playmaker_balanced', RM: 'winger_balanced', ST: 'advanced_forward_attack' } },
  { id: 'B', formation: '3-5-2', buildUp: 'Balanced', depth: 60, roles: { LM: 'wide_midfielder_support', RM: 'wide_midfielder_support', RDM: 'deep_lying_playmaker_defend', CAM: 'playmaker_attack', RST: 'poacher_attack' } },
  { id: 'C', formation: '4-3-3', buildUp: 'Counter', depth: 80, roles: { LB: 'attacking_wingback_attack', RB: 'attacking_wingback_attack', LW: 'inside_forward_attack', RW: 'inside_forward_attack' } },
  { id: 'D', formation: '4-4-2', buildUp: 'Balanced', depth: 50, roles: {} },
  { id: 'E', formation: '4-2-3-1 (2)', buildUp: 'Short', depth: 95, roles: { LB: 'attacking_wingback_attack', RB: 'attacking_wingback_attack', LDM: 'box_crasher_balanced', RDM: 'box_crasher_balanced', LM: 'winger_attack', RM: 'winger_attack', CAM: 'classic_10_attack', ST: 'false_9_build_up' } },
]
const sev = { INFO: 'bilgi', WARN: 'uyarı', RISK: 'risk' }
let md = '# E3-7b — kalibrasyon raporu\n\n'
md += '## 1. Negatif set: popüler meta formasyonlar, varsayılan roller, Balanced, hat 50, yalnız roller\n\nHedef: 0 uyarı ve 0 risk (bilgi serbest). `HealthyTacticsNoWarningsTest` bunu sabitler (önce kırmızı koştu).\n\n| Formasyon | Önce (uyarı/risk) | Sonra uyarı | Sonra risk | Sonra bilgi |\n|---|---|---|---|---|\n'
for (const id of Object.keys(NEG_BEFORE)) {
  const a = await call({ formation: id, buildUp: 'Balanced', depth: 50 })
  const c = (s) => a.findings.filter((f) => f.severity === s)
  md += `| ${id} | ${NEG_BEFORE[id].length ? NEG_BEFORE[id].join(', ') : '0'} | ${c('WARN').length} | ${c('RISK').length} | ${c('INFO').map((f) => f.code).join(', ') || '0'} |\n`
}
md += '\n## 2. Beş örnek taktik: önce / sonra (bulgu sayısı: yalnız roller / oyunculu)\n\nÖnce = E3-7 raporu. Oyunculu = geçici katalog kariyerinin (aynı örnek kadro) ilk 11\'i; seviye referansı katalog OVR bandının medyanıdır.\n\n| Taktik | Önce (roller / oyunculu) | Sonra (roller / oyunculu) | Sonra: kodlar (oyunculu) |\n|---|---|---|---|\n'
const ids = await (async () => {
  const careers = await (await fetch(`${base}/api/v1/careers`, { headers: { authorization: `Bearer ${token}` } })).json()
  const careerId = careers.data[0].id
  const players = await (await fetch(`${base}/api/v1/players?career=${careerId}&size=40&sort=overall&order=desc`, { headers: { authorization: `Bearer ${token}` } })).json()
  return { careerId, list: players.data.items }
})()
const detail = []
for (const ex of EXAMPLES) {
  const slotsReq = Object.entries(ex.roles).map(([slotId, roleId]) => ({ slotId, roleId }))
  const body = { formation: ex.formation, buildUp: ex.buildUp, depth: ex.depth, slots: slotsReq }
  const a = await call(body)
  const formations = await (await fetch(`${base}/api/v1/formations`)).json()
  const f = formations.data.find((x) => x.id === ex.formation)
  const used = new Set()
  const assigned = {}
  for (const s of f.slots) {
    const p = ids.list.find((i) => !used.has(i.id) && i.positions.includes(s.position)) ?? ids.list.find((i) => !used.has(i.id))
    used.add(p.id)
    assigned[s.slotId] = p.id
  }
  const b = await call({ ...body, careerId: ids.careerId, assigned })
  md += `| ${ex.id} | ${EX_BEFORE[ex.id][0]} / ${EX_BEFORE[ex.id][1]} | ${a.findings.length} / ${b.findings.length} | ${[...new Set(b.findings.map((x) => x.code))].join(', ') || '—'} |\n`
  detail.push({ ex, a, b })
}
md += '\n### Sonraki bulgular (kullanıcı metni ve sayısal kanıt)\n\n'
for (const { ex, a, b } of detail) {
  for (const [label, r] of [['yalnız roller', a], ['oyunculu', b]]) {
    md += `**${ex.id} — ${label}**${r.levelLabel ? ` (referans: ${r.levelLabel})` : ''}\n\n`
    if (r.findings.length === 0) { md += '_Bulgu yok._\n\n'; continue }
    md += '| Kod | Şiddet | Kanıt | Kullanıcı metni |\n|---|---|---|---|\n'
    for (const x of r.findings) {
      const ev = x.evidence.map((e) => `${e.metric} = ${e.value} ${e.op} ${e.threshold}${e.reference == null ? '' : ` (referans ${e.reference}, marj ${e.margin})`}`).join('<br>')
      md += `| ${x.code}${x.instance.side ? ` [${x.instance.side}]` : ''} | ${sev[x.severity]} | ${ev} | ${x.text} |\n`
    }
    md += '\n'
  }
}
md += '## 3. İki bağlam: aynı taktik, Crewe (EFL League Two) ve dev kulüp (Real Madrid)\n\nSeviye referansı takımın kendi liginin aynı mevki medyanıdır. Aynı taktik ve aynı roller; oyuncular takımın kendi oyuncularıdır (mevkiye göre OVR sırasıyla). Kanıtta değer · referans · marj görünür.\n\n' + twoContext.replace(/^# .*\n/, '').replace(/^## /gm, '### ').replace(/^### (Dev|Alt)/gm, '#### $1')
md += '\n## Notlar\n- Pas güvenliği referansı GK/CB/CDM oyuncularının medyanıdır; kaleciler dahil olduğu için sayı düşük görünür, kuralın ölçtüğü ortalama da aynı grubu (GK+CB+CDM) kapsar, tanım tutarlıdır.\n- Dayanıklılık kuralı mutlak kalır (yorulma mutlaktır).\n- Marjlar (3) ve asgari örnek (15) `verified:false`; referans için yeterli örnek yoksa kural mutlak eşiğe düşer.\n'
writeFileSync(fileURLToPath(new URL('../docs/review/v2/E3-7b_kalibrasyon.md', import.meta.url)), md)
console.log('ok')
