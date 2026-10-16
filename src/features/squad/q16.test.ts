/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 11 §8 Q16 (F11): UT ve kariyer kadro sayfaları çekirdeği paylaşır. Taktik çözme, taktik kodu, formasyon/rol durumu ve
 * eski kayıt temizliği sayfalarda yeniden yazılmaz; yeni kadro/taktik işi önce `src/features/squad/` içine girer.
 */
const PAGES = ['src/pages/UtSquadPage.tsx', 'src/pages/SquadBuilderPage.tsx']
const FORBIDDEN = ['endpoints.resolveTactic', 'endpoints.exportTacticCode', 'endpoints.importTacticCode', 'endpoints.formations', 'endpoints.roles', 'utSquadStore.set', 'tacticStore.set', 'lineupStore.set']

describe('Q16: kadro sayfaları çekirdeği kullanır', () => {
  it.each(PAGES)('%s çekirdek hook ve bileşenlerini içe aktarır', (page) => {
    const source = readFileSync(page, 'utf8')
    expect(source).toContain("from '../features/squad/useSquadWorkspace'")
    expect(source).toContain("from '../features/squad/TacticCodeCard'")
    expect(source).toContain("from '../features/squad/SquadWorkspaceView'")
  })

  it.each(PAGES)('%s çekirdeğin işini kendi içinde yapmaz', (page) => {
    const source = readFileSync(page, 'utf8')
    FORBIDDEN.forEach((call) => expect(source, `${page} → ${call}`).not.toContain(call))
  })

  it('eski ikiz bileşenler (UtTacticCode, EaCodeCard) geri gelmez', () => {
    PAGES.forEach((page) => expect(readFileSync(page, 'utf8')).not.toMatch(/function UtTacticCode|EaCodeCard/))
  })
})
