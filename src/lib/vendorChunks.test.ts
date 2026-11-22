import { describe, expect, it } from 'vitest'
import { VENDOR_GROUPS } from './vendorChunks'

const groupOf = (id: string) => VENDOR_GROUPS.find((g) => g.test.test(id))?.name

/** FCA-35 W8: kütüphaneler ayrı, kararlı parçalarda; her deploy'da yalnız uygulama kodu yeniden indirilir. */
describe('VENDOR_GROUPS', () => {
  it('react, router, query ve dexie kendi parçasında', () => {
    expect(groupOf('/app/node_modules/react-dom/cjs/react-dom.production.js')).toBe('vendor-react')
    expect(groupOf('/app/node_modules/react/index.js')).toBe('vendor-react')
    expect(groupOf('/app/node_modules/scheduler/index.js')).toBe('vendor-react')
    expect(groupOf('/app/node_modules/react-router/dist/index.js')).toBe('vendor-router')
    expect(groupOf('/app/node_modules/@tanstack/query-core/build/index.js')).toBe('vendor-query')
    expect(groupOf('C:\\app\\node_modules\\dexie\\dist\\dexie.mjs')).toBe('vendor-dexie')
  })

  it('uygulama kodu ve küçük kütüphaneler gruba girmez', () => {
    expect(groupOf('/app/src/features/dashboard/DashboardPage.tsx')).toBeUndefined()
    expect(groupOf('/app/node_modules/lucide-react/dist/esm/icons/x.js')).toBeUndefined()
    expect(groupOf('/app/node_modules/react-is/index.js')).toBeUndefined()
  })
})
