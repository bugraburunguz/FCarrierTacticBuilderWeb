// E3-9: 106 replikanın tacticCode'u ve etiketsiz analiz bulguları → docs/review/v2/E3-9_replika_analizleri.md
// Replika "kötü kurulmuş" görünüyorsa ya veri ya kural hatasıdır: uyarı/risk üreten her replika ayrıca listelenir.
// Kullanım: node scripts/e3-9-replica-report.mjs   (yerel yığın, herkese açık uçlar)
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = 'http://localhost:8081/api/v1'
// Genel API hız sınırı (dakikada 120): 429'da bekleyip yeniden dener.
const get = async (path) => {
  for (;;) {
    const res = await fetch(base + path)
    if (res.status !== 429) return (await res.json()).data
    await new Promise((r) => setTimeout(r, 5000))
  }
}
const list = await get('/replicas')
const sev = { INFO: 'bilgi', WARN: 'uyarı', RISK: 'risk' }
const rows = []
for (const r of list) {
  const d = await get(`/replicas/${r.id}`)
  rows.push({ r, a: d.analysis, d })
}
const count = (a, s) => a.findings.filter((f) => f.severity === s).length
const bad = rows.filter(({ a }) => count(a, 'WARN') + count(a, 'RISK') > 0)
const byCode = {}
rows.forEach(({ a }) => a.findings.forEach((f) => (byCode[f.code] = (byCode[f.code] || 0) + 1)))

let md = `# E3-9 — replikalar: tacticCode ve analiz bulguları\n\n${list.length} replika (yer tutucu \`ucl_winner_2026_tbd\` hariç). \`tacticCode\` sunucuda \`EaTacticCodec\` ile üretildi ve decode edilince seed ayarlarıyla (formasyon, build-up, hat, 11 × mevki/rol/focus) **birebir** aynı çıktı (\`ReplicaSeedIntegrationTest\`, 106/106). Analiz etiketsizdir: formasyon konumları + replikanın rolleri + build-up + hat (oyuncu yok; oyuncu gerektiren kurallar çalışmaz).\n\n`
md += `## Özet\n\n- Uyarı/risk üreten replika: **${bad.length} / ${list.length}**; yalnız bilgi ya da bulgusuz: ${list.length - bad.length}\n- Kural başına bulgu sayısı: ${Object.entries(byCode).sort((x, y) => y[1] - x[1]).map(([c, n]) => `${c} ${n}`).join(' · ')}\n\n`
md += `## Uyarı/risk üreten replikalar (veri mi kural mı? incelenecek)\n\n| Replika | Formasyon · build-up · hat | Benzerlik | Uyarı/risk kodları |\n|---|---|---|---|\n`
for (const { r, a } of bad) {
  md += `| ${r.id} (${r.club} ${r.season}, ${r.coach}) | ${r.eaFormation} · ${r.buildUp} · ${r.lineHeight} | ${r.fidelity ?? '—'}/5 | ${a.findings.filter((f) => f.severity !== 'INFO').map((f) => `${f.code}${f.instance.side ? `[${f.instance.side}]` : ''} (${sev[f.severity]})`).join(', ')} |\n`
}
// Değerlendirme: no_anchor'u hangi bacak tetikledi?
const anchorLegs = {}
let anchorTotal = 0
rows.forEach(({ a }) =>
  a.findings
    .filter((f) => f.code === 'no_anchor')
    .forEach((f) => {
      anchorTotal++
      const legs = f.evidence.slice(1).map((e) => e.metric).sort().join(' + ')
      anchorLegs[legs] = (anchorLegs[legs] || 0) + 1
    }),
)
const striker = rows.filter(({ a }) => a.findings.some((f) => f.code === 'striker_line_no_runner')).length
const legText = Object.entries(anchorLegs).map(([k, v]) => `${k} → ${v}`).join(' · ')
md += `## Değerlendirme: kural mı veri mi?\n\n`
md += `- **no_anchor (${anchorTotal})**: tetikleyen bacaklar: ${legText}. Yalnız "hat ≥ HIGH" bacağıyla uyarı alan ${anchorLegs.BAND_ORDINAL ?? 0} replika çoğunlukla yüksek baskı takımıdır (Sacchi, Cruyff, Guardiola, Sarri…): çapasız ama yüksek presli takımın koruması hat yüksekliğidir, geri savunma sayısı değil; bu bacak baskı sistemlerini fazla cezalandırıyor. **Öneri:** hat bacağını "hat ≥ HIGH VE geri savunma < 5" yap (Buğra kararı; kural bu raporda değiştirilmedi).\n`
md += `- **striker_line_no_runner (${striker})**: forvet hattında arkaya koşan (runBehind ≥ 0,4) yok; şiddet bilgi, çoğu Poacher/Target/False 9 kullanan klasik forvet düzeni: veri hatası değil, rol seçimi gerçekçi (kural bilgi kalmalı).\n`
md += `- **corridor_no_width / wing_gap_overlap**: replikaların bilinçli kanat/bek mekanizmalarını (içe kesen kanat + bek bindirmesi) işaret eder; seed'deki gerçek şekille uyumlu, veri hatası görünmüyor; eşik tartışılabilir.\n`
md += `- Benzerlik ≤ 3 olan replikalar ayrıca \`verify\` listesindedir (REP-06); bu rapor onların analizini yapar, doğrulamaz.\n\n`
md += `\n## Tüm replikalar\n\n| Replika | Kod | Formasyon · build-up · hat | Bulgu (şiddet kod) |\n|---|---|---|---|\n`
for (const { r, a } of rows) {
  md += `| ${r.id} | \`${r.tacticCode}\` | ${r.eaFormation} · ${r.buildUp} · ${r.lineHeight} | ${a.findings.map((f) => `${sev[f.severity]} ${f.code}${f.instance.side ? `[${f.instance.side}]` : ''}`).join('; ') || '—'} |\n`
}
md += `\n## Bulgu ayrıntıları (uyarı/risk) — kanıt sayılarıyla\n\n`
for (const { r, a } of bad) {
  md += `### ${r.id}\n\n| Kod | Şiddet | Kanıt | Kullanıcı metni |\n|---|---|---|---|\n`
  for (const f of a.findings.filter((x) => x.severity !== 'INFO')) {
    const ev = f.evidence.map((e) => `${e.metric} = ${e.value} ${e.op} ${e.threshold}`).join('<br>')
    md += `| ${f.code}${f.instance.side ? ` [${f.instance.side}]` : ''} | ${sev[f.severity]} | ${ev} | ${f.text} |\n`
  }
  md += '\n'
}
writeFileSync(fileURLToPath(new URL('../docs/review/v2/E3-9_replika_analizleri.md', import.meta.url)), md)
console.log(`replika ${list.length}; uyarı/risk: ${bad.length}`)
console.log(Object.entries(byCode).sort((x, y) => y[1] - x[1]).map(([c, n]) => `${c}:${n}`).join(' '))
