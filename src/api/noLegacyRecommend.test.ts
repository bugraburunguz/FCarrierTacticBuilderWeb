import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LEGACY = ['/recommend/slot', '/recommend/transfer-targets', '/scouting/', 'recommendSlot', 'transferTargets', 'scoutingSearch', 'slotView']

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return sources(path)
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe('E3-10: eski öneri uçları web\'de çağrılmaz (backend\'de Deprecation başlığıyla bir sürüm yaşar)', () => {
  it('kaynakta eski uç yolu ya da adı yok', () => {
    const hits = sources('src').flatMap((file) => {
      const text = readFileSync(file, 'utf8')
      return LEGACY.filter((needle) => text.includes(needle)).map((needle) => `${file}: ${needle}`)
    })
    expect(hits).toEqual([])
  })
})
