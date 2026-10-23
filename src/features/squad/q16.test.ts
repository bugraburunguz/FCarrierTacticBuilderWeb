/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 11 §8 Q16 (F11): UT ve kariyer kadro sayfaları çekirdeği paylaşır. Taktik çözme, taktik kodu, formasyon/rol durumu ve
 * eski kayıt temizliği sayfalarda yeniden yazılmaz; yeni kadro/taktik işi önce `src/features/squad/` içine girer.
 * V3-07b: sayfa mantığı mod başına tek hook'ta (useCareerSquadBuilder / useUtSquadBuilder); v2 ve v3 sayfası aynı hook'u kullanır.
 */
const HOOKS = { career: 'src/features/squad/useCareerSquadBuilder.tsx', ut: 'src/features/squad/useUtSquadBuilder.tsx' }
// KARIYER-UX FAZ 4a: v3 kariyer kurucusu Taktik Lab'ın Kurucu sekmesi (features/lab/LabBuilder).
const V3_PAGES = { career: 'src/features/lab/LabBuilder.tsx', ut: 'src/features/squad/UtSquadBuilderPage.tsx' }
const V3_SQUAD = { career: '../squad/', ut: './' }
const V2_PAGES = { career: 'src/pages/SquadBuilderPage.tsx', ut: 'src/pages/UtSquadPage.tsx' }
const ALL = [...Object.values(HOOKS), ...Object.values(V3_PAGES), ...Object.values(V2_PAGES)]
const FORBIDDEN = ['endpoints.resolveTactic', 'endpoints.exportTacticCode', 'endpoints.importTacticCode', 'endpoints.formations', 'endpoints.roles', 'utSquadStore.set', 'tacticStore.set', 'lineupStore.set']
const read = (file: string) => readFileSync(file, 'utf8')

describe('Q16: kadro sayfaları çekirdeği kullanır', () => {
  it.each(Object.values(HOOKS))('%s çalışma alanını çekirdekten alır (tek çözüm sorgusu)', (hook) => {
    expect(read(hook)).toContain("from './useSquadWorkspace'")
  })

  it.each(['career', 'ut'] as const)('%s: v2 ve v3 sayfası aynı hook\'u ve aynı taktik kodu bileşenini kullanır', (mode) => {
    const hookName = mode === 'career' ? 'useCareerSquadBuilder' : 'useUtSquadBuilder'
    expect(read(V3_PAGES[mode])).toContain(`from '${V3_SQUAD[mode]}${hookName}'`)
    expect(read(V2_PAGES[mode])).toContain(`from '../features/squad/${hookName}'`)
    expect(read(V3_PAGES[mode])).toContain(`from '${V3_SQUAD[mode]}TacticCodeCard'`)
    expect(read(V2_PAGES[mode])).toContain("from '../features/squad/TacticCodeCard'")
    expect(read(V3_PAGES[mode])).toContain(`from '${V3_SQUAD[mode]}SquadWorkspaceView'`)
  })

  it.each(ALL)('%s çekirdeğin işini kendi içinde yapmaz', (file) => {
    const source = read(file)
    FORBIDDEN.forEach((call) => expect(source, `${file} → ${call}`).not.toContain(call))
  })

  it('v2 sayfaları v3 dalı taşımaz (v3 ayrı sayfa dosyasında)', () => {
    Object.values(V2_PAGES).forEach((page) => expect(read(page)).not.toMatch(/isV3\(\)|<SquadWorkspaceView/))
  })

  it('eski ikiz bileşenler (UtTacticCode, EaCodeCard) geri gelmez', () => {
    ALL.forEach((file) => expect(read(file)).not.toMatch(/function UtTacticCode|EaCodeCard/))
  })
})
