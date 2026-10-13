// Kural kopyasını backend'den çeker: `npm run sync:rules` (RULES_URL ile adres değiştirilir). Paketli kopya yalnız fallback'tir (BE-ARCH-03).
import { writeFileSync } from 'node:fs'
import { rulesHash } from './rules-hash.mjs'

const url = process.env.RULES_URL ?? 'http://localhost:8081/api/v1/ut/rules'
const response = await fetch(url)
if (!response.ok) {
  throw new Error(`${url} -> ${response.status}`)
}
const body = await response.json()
const { rulesHash: served, ...doc } = body.data ?? body
const hash = rulesHash(doc)
if (served && served !== hash) {
  throw new Error(`Sunucu hash'i (${served}) yerel hesapla (${hash}) uyuşmuyor; kanonik algoritma farklı olabilir.`)
}
writeFileSync(new URL('../src/lib/utRules.fc27.json', import.meta.url), JSON.stringify(doc, null, 2) + '\n')
writeFileSync(new URL('../src/lib/utRules.fc27.hash.json', import.meta.url), JSON.stringify({ rulesHash: hash }, null, 2) + '\n')
console.log(`Kurallar güncellendi: ${hash}`)
