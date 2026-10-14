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
md += `- **no_anchor (${anchorTotal})**: tetikleyen bacaklar: ${legText}. Kural kararı (Buğra): hat bacağı "hat ≥ HIGH VE geri savunma < 5"; çapa tanımı d ≥ 0,8 roller + tüm Deep-Lying Playmaker focus'ları.
`
md += `- **striker_line_no_runner (${striker})**: forvet hattında arkaya koşan (runBehind ≥ 0,4) yok; şiddet bilgi, çoğu Poacher/Target/False 9 kullanan klasik forvet düzeni: veri hatası değil, rol seçimi gerçekçi (kural bilgi kalmalı).\n`
md += `- **corridor_no_width / wing_gap_overlap**: replikaların bilinçli kanat/bek mekanizmalarını (içe kesen kanat + bek bindirmesi) işaret eder; seed'deki gerçek şekille uyumlu, veri hatası görünmüyor; eşik tartışılabilir.\n`
md += `- Benzerlik ≤ 3 olan replikalar ayrıca \`verify\` listesindedir (REP-06); bu rapor onların analizini yapar, doğrulamaz.\n\n`
// E3-9 sonrası karar 1-2: eski kuralda yalnız "hat ≥ HIGH" bacağıyla uyarı alan 13 replika; hangi değişiklik çözdü?
const OLD_BAND_ONLY = ['guardiola_city_2023', 'rodgers_liverpool_2014', 'alonso_leverkusen_2024', 'cruyff_barcelona_1992', 'sacchi_milan_1989', 'vangaal_ajax_1995', 'guardiola_bayern_2014', 'sarri_napoli_2018', 'dezerbi_sassuolo_2021', 'michel_girona_2024', 'motta_bologna_2024', 'nagelsmann_leipzig_2020', 'postecoglou_celtic_2023']
md += `
## Karar 1-2 etkisi: eski "hat ≥ HIGH" bacağıyla uyarı alan 13 replika

İki değişiklik: (1) hat bacağı artık "hat ≥ HIGH VE geri savunma < 5"; (2) Deep-Lying Playmaker (her focus) çapa sayılır.

| Replika | Geri savunma | DLP | Çözen | Şimdiki bulgu |
|---|---|---|---|---|
`
for (const id of OLD_BAND_ONLY) {
  const row = rows.find((x) => x.r.id === id)
  const rest = row.a.metrics.restDefence.count
  const dlp = row.d.fc27.slots.filter((x) => /deep.lying/i.test(x.role)).map((x) => `${x.position} ${x.focus}`).join(', ')
  const now = row.a.findings.filter((f) => f.code.startsWith('no_anchor')).map((f) => f.code).join(', ') || 'yok'
  const by = [rest >= 5 ? 'hat bacağı (geri savunma ' + rest + ' ≥ 5)' : '', dlp ? 'DLP çapa' : ''].filter(Boolean).join(' + ')
  md += `| ${id} | ${rest} | ${dlp || '—'} | ${by} | ${now} |\n`
}
md += '\nHer 13 vakada geri savunma ≥ 5: yalnız (1) bile uyarıyı kaldırır; DLP olanlarda (2) "çapa yok" bilgisini de kaldırır (11 replika: bulgu kalmadı); DLP olmayan van Gaal Ajax 1995 ve Nagelsmann Leipzig 2020 yalnız bilgi seviyesine düştü.\n'
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
