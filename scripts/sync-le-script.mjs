// LE export script'inin tek kaynağı backend `tools/live-editor/`: `npm run sync:le-script` public/ kopyasını ve özetini yeniler.
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const source = process.env.LE_SCRIPT ?? new URL('../../FCarrierTacticBuilderBackend/tools/live-editor/fc27_career_export.lua', import.meta.url)
const target = new URL('../public/fc27_career_export.lua', import.meta.url)
copyFileSync(source, target)
const sha = createHash('sha256').update(readFileSync(target)).digest('hex')
writeFileSync(new URL('../src/lib/leScript.hash.json', import.meta.url), JSON.stringify({ sha256: sha }, null, 2) + '\n')
console.log(`LE script güncellendi: ${sha}`)
