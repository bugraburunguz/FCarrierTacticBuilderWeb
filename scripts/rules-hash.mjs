import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

export function canonical(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonical).join(',') + ']'
  }
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'
  }
  return JSON.stringify(value)
}

export function rulesHash(doc) {
  const { rulesHash: _ignored, ...rest } = doc
  return createHash('sha256').update(canonical(rest), 'utf8').digest('hex')
}

if (process.argv[2]) {
  const hash = rulesHash(JSON.parse(readFileSync(process.argv[2], 'utf8')))
  if (process.argv[3]) {
    writeFileSync(process.argv[3], hash + '\n')
  }
  console.log(hash)
}
